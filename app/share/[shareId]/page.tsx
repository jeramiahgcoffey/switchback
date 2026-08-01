import type { Metadata } from "next";
import { after } from "next/server";
import { cache } from "react";
import { Button } from "@/components/ui/button";
import { TripPacketClient } from "@/components/plan/trip-packet-client";
import {
  getPublicSharedTrip,
  recordSharedTripView,
} from "@/lib/shared-trip-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getShare = cache(getPublicSharedTrip);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;
  const share = await getShare(shareId);
  return {
    title: share?.plan.name?.trim() || "Shared Trip Brief",
    description:
      "A read-only Switchback field brief with itinerary, rig readiness, waypoints, and packing checks.",
    robots: { index: false, follow: false },
  };
}

function UnavailableBrief() {
  return (
    <section className="bg-topo mx-auto my-12 max-w-2xl rounded-lg border border-edge bg-gunmetal/70 px-6 py-14 text-center sm:px-10">
      <p className="stat-label">Shared brief unavailable</p>
      <h1 className="heading-display mt-3 text-4xl sm:text-5xl">
        This dispatch is closed
      </h1>
      <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-sand-dim">
        The link may have expired, been revoked by its owner, or been copied
        incorrectly. Ask the trip planner for a fresh brief.
      </p>
      <Button href="/trails" className="mt-7">
        Explore trails
      </Button>
    </section>
  );
}

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const share = await getShare(shareId);
  if (!share) return <UnavailableBrief />;

  after(() =>
    recordSharedTripView(shareId).catch((error) => {
      console.error("shared_trip_view_error", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : "Unknown failure",
      });
    }),
  );

  return (
    <TripPacketClient
      tripId={share.plan.id}
      sharedTrip={share.plan}
      sharedMeta={{
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
      }}
    />
  );
}
