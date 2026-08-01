import { after, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server-session";
import { isShareId } from "@/lib/shared-trip";
import { revokeSharedTrip } from "@/lib/shared-trip-store";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ shareId: string }> },
) {
  const userIdPromise = getSessionUserId();
  const { shareId } = await params;
  if (!isShareId(shareId)) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  const userId = await userIdPromise;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const revoked = await revokeSharedTrip(userId, shareId);
    if (!revoked) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    after(() => console.info("shared_trip_revoked"));
    return NextResponse.json(
      { revoked: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("shared_trip_revoke_error", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown failure",
    });
    return NextResponse.json(
      { error: "Sharing is temporarily unavailable" },
      { status: 503 },
    );
  }
}
