import { after, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server-session";
import { parseCreateSharedTripInput } from "@/lib/shared-trip";
import {
  createSharedTrip,
  listSharedTrips,
  SharedTripLimitError,
} from "@/lib/shared-trip-store";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 96 * 1024;

async function readJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) throw new RangeError("Body too large");
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new RangeError("Body too large");
  return JSON.parse(text) as unknown;
}

function unavailable(error: unknown) {
  console.error("shared_trip_store_error", {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : "Unknown failure",
  });
  return NextResponse.json(
    { error: "Sharing is temporarily unavailable" },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sourceTripId = new URL(request.url).searchParams.get("tripId")?.slice(0, 256);
  try {
    const shares = await listSharedTrips(userId, sourceTripId || undefined);
    return NextResponse.json(
      { shares },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request: Request) {
  const userIdPromise = getSessionUserId();
  const bodyPromise = readJson(request);

  let userId: string | null;
  let body: unknown;
  try {
    [userId, body] = await Promise.all([userIdPromise, bodyPromise]);
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = parseCreateSharedTripInput(body);
  if (!input) {
    return NextResponse.json({ error: "Invalid trip snapshot" }, { status: 400 });
  }

  try {
    const share = await createSharedTrip(userId, input);
    after(() => {
      console.info("shared_trip_created", {
        expires: input.expiresInDays ?? "never",
        fieldNotesIncluded: input.includeFieldNotes,
      });
    });
    return NextResponse.json(
      { share },
      {
        status: 201,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    if (error instanceof SharedTripLimitError) {
      return NextResponse.json(
        { error: "Share limit reached. Revoke an old link and try again." },
        { status: 429 },
      );
    }
    return unavailable(error);
  }
}
