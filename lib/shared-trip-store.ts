import "server-only";

import { randomBytes } from "node:crypto";
import { MongoServerError, type Collection } from "mongodb";
import client from "@/lib/mongodb";
import { getTrailBySlug } from "@/lib/data/trails";
import {
  SHARED_TRIP_SCHEMA_VERSION,
  isShareId,
  shareExpiryDate,
  type CreateSharedTripInput,
  type SharedTripOwnerDTO,
  type SharedTripPublicDTO,
  type SharedTripSnapshot,
} from "@/lib/shared-trip";

const DB_NAME = process.env.MONGODB_DB || "switchback";
const COLLECTION_NAME = "shared_trip_briefs";
const MAX_ACTIVE_SHARES = 20;
const MAX_CREATIONS_PER_HOUR = 20;

interface SharedTripDocument {
  shareId: string;
  ownerId: string;
  sourceTripId: string;
  title: string;
  trailSlug: string;
  schemaVersion: typeof SHARED_TRIP_SCHEMA_VERSION;
  snapshot: SharedTripSnapshot;
  createdAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  viewCount: number;
  lastViewedAt?: Date;
}

export class SharedTripLimitError extends Error {
  constructor() {
    super("Shared trip creation limit reached");
    this.name = "SharedTripLimitError";
  }
}

function collection(): Collection<SharedTripDocument> {
  return client
    .db(DB_NAME)
    .collection<SharedTripDocument>(COLLECTION_NAME);
}

let setupReady: Promise<void> | null = null;

/** Create the additive collection and its bounded access-path indexes once. */
export function ensureSharedTripStore(): Promise<void> {
  if (!setupReady) {
    setupReady = (async () => {
      const db = client.db(DB_NAME);
      try {
        await db.createCollection(COLLECTION_NAME, {
          validator: {
            $jsonSchema: {
              bsonType: "object",
              required: [
                "shareId",
                "ownerId",
                "sourceTripId",
                "title",
                "trailSlug",
                "schemaVersion",
                "snapshot",
                "createdAt",
                "viewCount",
              ],
              properties: {
                shareId: { bsonType: "string", minLength: 24, maxLength: 24 },
                ownerId: { bsonType: "string", minLength: 1, maxLength: 256 },
                sourceTripId: {
                  bsonType: "string",
                  minLength: 1,
                  maxLength: 256,
                },
                title: { bsonType: "string", minLength: 1, maxLength: 256 },
                trailSlug: { bsonType: "string", minLength: 1, maxLength: 256 },
                schemaVersion: { bsonType: "int", enum: [1] },
                snapshot: {
                  bsonType: "object",
                  required: ["schemaVersion", "plan"],
                  properties: {
                    schemaVersion: { bsonType: "int", enum: [1] },
                    plan: { bsonType: "object" },
                  },
                },
                createdAt: { bsonType: "date" },
                expiresAt: { bsonType: "date" },
                revokedAt: { bsonType: "date" },
                viewCount: { bsonType: "int", minimum: 0 },
                lastViewedAt: { bsonType: "date" },
              },
            },
          },
          validationLevel: "strict",
          validationAction: "error",
        });
      } catch (error) {
        if (!(error instanceof MongoServerError) || error.code !== 48) {
          throw error;
        }
      }

      await Promise.all([
        collection().createIndex({ shareId: 1 }, { unique: true }),
        collection().createIndex({ ownerId: 1, createdAt: -1 }),
        collection().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      ]);
    })().catch((error) => {
      setupReady = null;
      throw error;
    });
  }
  return setupReady;
}

function ownerDTO(document: SharedTripDocument): SharedTripOwnerDTO {
  return {
    shareId: document.shareId,
    sourceTripId: document.sourceTripId,
    title: document.title,
    trailSlug: document.trailSlug,
    createdAt: document.createdAt.toISOString(),
    expiresAt: document.expiresAt?.toISOString() ?? null,
    revokedAt: document.revokedAt?.toISOString() ?? null,
    viewCount: document.viewCount,
    lastViewedAt: document.lastViewedAt?.toISOString() ?? null,
  };
}

function activeFilter(now: Date) {
  return {
    revokedAt: { $exists: false as const },
    $or: [
      { expiresAt: { $exists: false as const } },
      { expiresAt: { $gt: now } },
    ],
  };
}

/** List a bounded set of links owned by the session user. */
export async function listSharedTrips(
  ownerId: string,
  sourceTripId?: string,
): Promise<SharedTripOwnerDTO[]> {
  await ensureSharedTripStore();
  const documents = await collection()
    .find({
      ownerId,
      ...(sourceTripId ? { sourceTripId } : {}),
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
  return documents.map(ownerDTO);
}

/** Insert a new immutable snapshot. Existing links are never overwritten. */
export async function createSharedTrip(
  ownerId: string,
  input: CreateSharedTripInput,
  now = new Date(),
): Promise<SharedTripOwnerDTO> {
  await ensureSharedTripStore();

  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const [activeCount, recentCount] = await Promise.all([
    collection().countDocuments({ ownerId, ...activeFilter(now) }),
    collection().countDocuments({ ownerId, createdAt: { $gte: oneHourAgo } }),
  ]);
  if (
    activeCount >= MAX_ACTIVE_SHARES ||
    recentCount >= MAX_CREATIONS_PER_HOUR
  ) {
    throw new SharedTripLimitError();
  }

  const sourceTripId = input.plan.id;
  const trail = getTrailBySlug(input.plan.trailSlug);
  const title = (input.plan.name?.trim() || trail?.name || "Shared trip").slice(
    0,
    256,
  );
  const expiresAt = shareExpiryDate(input.expiresInDays, now);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const shareId = randomBytes(18).toString("base64url");
    const plan = { ...input.plan, id: `brief-${shareId}` };
    const document: SharedTripDocument = {
      shareId,
      ownerId,
      sourceTripId,
      title,
      trailSlug: plan.trailSlug,
      schemaVersion: SHARED_TRIP_SCHEMA_VERSION,
      snapshot: {
        schemaVersion: SHARED_TRIP_SCHEMA_VERSION,
        plan,
      },
      createdAt: now,
      ...(expiresAt ? { expiresAt } : {}),
      viewCount: 0,
    };

    try {
      await collection().insertOne(document);
      return ownerDTO(document);
    } catch (error) {
      if (!(error instanceof MongoServerError) || error.code !== 11000) {
        throw error;
      }
    }
  }
  throw new Error("Unable to allocate a unique shared trip id");
}

/** Return only public snapshot fields; ownership never crosses this boundary. */
export async function getPublicSharedTrip(
  shareId: string,
  now = new Date(),
): Promise<SharedTripPublicDTO | null> {
  if (!isShareId(shareId)) return null;
  await ensureSharedTripStore();
  const document = await collection().findOne(
    { shareId, ...activeFilter(now) },
    {
      projection: {
        _id: 0,
        snapshot: 1,
        createdAt: 1,
        expiresAt: 1,
      },
    },
  );
  if (!document) return null;
  return {
    plan: document.snapshot.plan,
    createdAt: document.createdAt.toISOString(),
    expiresAt: document.expiresAt?.toISOString() ?? null,
  };
}

/** Best-effort aggregate view instrumentation with no viewer identifiers. */
export async function recordSharedTripView(
  shareId: string,
  now = new Date(),
): Promise<void> {
  if (!isShareId(shareId)) return;
  await ensureSharedTripStore();
  await collection().updateOne(
    { shareId, ...activeFilter(now) },
    { $inc: { viewCount: 1 }, $set: { lastViewedAt: now } },
  );
}

/** Revoke only when the authenticated user owns the link. */
export async function revokeSharedTrip(
  ownerId: string,
  shareId: string,
  now = new Date(),
): Promise<boolean> {
  if (!isShareId(shareId)) return false;
  await ensureSharedTripStore();
  const result = await collection().updateOne(
    { shareId, ownerId, revokedAt: { $exists: false } },
    { $set: { revokedAt: now } },
  );
  return result.modifiedCount === 1;
}
