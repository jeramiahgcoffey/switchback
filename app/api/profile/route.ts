/**
 * Per-user profile: the server side of cross-device sync. One document per
 * user in the `profiles` collection, mirroring the two synced localStorage
 * blobs (active rig + trip plan) plus a client `updatedAt` for last-write-wins.
 *
 * The user id always comes from the Better Auth session, never the request
 * body. Input is whitelisted field-by-field so a client can't stash arbitrary
 * or oversized data in the account document.
 */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import client from "@/lib/mongodb";
import type { ActiveRigState, TripPlan, UserProfile } from "@/lib/types";

export const runtime = "nodejs";

const DB_NAME = process.env.MONGODB_DB || "switchback";
const MAX_GEAR_IDS = 500;
const MAX_DAYS = 60;
const MAX_CHECKLIST_KEYS = 1000;

function profiles() {
  return client.db(DB_NAME).collection<UserProfile & { userId: string }>("profiles");
}

async function getUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const str = (v: unknown): v is string => typeof v === "string";
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const bool = (v: unknown): v is boolean => typeof v === "boolean";

/** Whitelist the rig spec-override fields; drop anything unrecognized. */
function sanitizeCustomSpecs(v: unknown): ActiveRigState["customSpecs"] | undefined {
  if (!isObj(v)) return undefined;
  const out: Record<string, number | boolean> = {};
  for (const k of ["tireIn", "clearanceIn", "fuelRangeMiles", "payloadLbs"]) {
    if (num(v[k])) out[k] = v[k] as number;
  }
  for (const k of ["hasWinch", "hasLockers", "hasFourLo"]) {
    if (bool(v[k])) out[k] = v[k] as boolean;
  }
  return Object.keys(out).length ? (out as ActiveRigState["customSpecs"]) : undefined;
}

function sanitizeActiveRig(v: unknown): ActiveRigState {
  if (!isObj(v) || !str(v.rigId)) return { rigId: "", gearIds: [] };
  const gearIds = Array.isArray(v.gearIds)
    ? v.gearIds.filter(str).slice(0, MAX_GEAR_IDS)
    : [];
  const rig: ActiveRigState = { rigId: v.rigId, gearIds };
  const specs = sanitizeCustomSpecs(v.customSpecs);
  if (specs) rig.customSpecs = specs;
  return rig;
}

function sanitizeTripPlan(v: unknown): TripPlan | null {
  if (!isObj(v)) return null;
  if (!str(v.trailSlug) || !Array.isArray(v.days)) return null;
  const days = v.days.slice(0, MAX_DAYS).map((d): TripPlan["days"][number] => {
    const day = isObj(d) ? d : {};
    return {
      day: num(day.day) ? day.day : 0,
      startWaypointId: str(day.startWaypointId) ? day.startWaypointId : "",
      endWaypointId: str(day.endWaypointId) ? day.endWaypointId : "",
      miles: num(day.miles) ? day.miles : 0,
      estWheelHours: num(day.estWheelHours) ? day.estWheelHours : 0,
      campWaypointId: str(day.campWaypointId) ? day.campWaypointId : null,
      resupplyWaypointIds: Array.isArray(day.resupplyWaypointIds)
        ? day.resupplyWaypointIds.filter(str).slice(0, MAX_DAYS)
        : [],
    };
  });
  const checklist: Record<string, boolean> = {};
  if (isObj(v.checklist)) {
    for (const [k, val] of Object.entries(v.checklist).slice(0, MAX_CHECKLIST_KEYS)) {
      if (bool(val)) checklist[k] = val;
    }
  }
  return {
    id: str(v.id) ? v.id : "",
    trailSlug: v.trailSlug,
    startDate: str(v.startDate) ? v.startDate : "",
    partySize: num(v.partySize) ? v.partySize : 1,
    rigId: str(v.rigId) ? v.rigId : "",
    days,
    checklist,
    createdAt: str(v.createdAt) ? v.createdAt : "",
  };
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await profiles().findOne({ userId });
  const profile: UserProfile | null = doc
    ? { activeRig: doc.activeRig, tripPlan: doc.tripPlan, updatedAt: doc.updatedAt }
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
  if (!isObj(body)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const profile: UserProfile = {
    activeRig: sanitizeActiveRig(body.activeRig),
    tripPlan: sanitizeTripPlan(body.tripPlan),
    updatedAt: str(body.updatedAt) ? body.updatedAt : new Date().toISOString(),
  };

  await profiles().updateOne(
    { userId },
    { $set: { ...profile, userId } },
    { upsert: true },
  );
  return NextResponse.json({ profile });
}
