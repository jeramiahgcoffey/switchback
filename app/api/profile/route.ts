/**
 * Per-user profile: the server side of cross-device sync. One document per
 * user in the `profiles` collection, mirroring the synced rig library, active
 * trip, and saved-trip blobs plus a client `updatedAt` for last-write-wins.
 *
 * The user id always comes from the Better Auth session, never the request
 * body. Input is whitelisted field-by-field so a client can't stash arbitrary
 * or oversized data in the account document.
 */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import client from "@/lib/mongodb";
import {
  isProfileBody,
  sanitizeUserProfile,
} from "@/lib/profile-sanitize";
import type { UserProfile } from "@/lib/types";

export const runtime = "nodejs";

const DB_NAME = process.env.MONGODB_DB || "switchback";
function profiles() {
  return client.db(DB_NAME).collection<UserProfile & { userId: string }>("profiles");
}

// Enforce one profile per user (prevents duplicate docs from concurrent
// first-time upserts) and index the lookup. Created once per server instance;
// createIndex is idempotent. Reset the cache on failure so it can retry.
let indexReady: Promise<unknown> | null = null;
function ensureIndexes() {
  if (!indexReady) {
    indexReady = profiles()
      .createIndex({ userId: 1 }, { unique: true })
      .catch((err) => {
        indexReady = null;
        throw err;
      });
  }
  return indexReady;
}

async function getUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureIndexes();
  const doc = await profiles().findOne({ userId });
  const profile: UserProfile | null = doc
    ? sanitizeUserProfile(doc as unknown as Record<string, unknown>)
    : null;
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isProfileBody(body)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const profile = sanitizeUserProfile(body);

  await ensureIndexes();
  await profiles().updateOne(
    { userId },
    { $set: { ...profile, userId } },
    { upsert: true },
  );
  return NextResponse.json({ profile });
}
