import type { Metadata } from "next";
import { TripPacketClient } from "@/components/plan/trip-packet-client";

export const metadata: Metadata = {
  title: "Trip Packet",
  description:
    "A printable field packet with itinerary, fuel checks, rig details, waypoints, and packing list.",
};

export default async function TripPacketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TripPacketClient tripId={id} />;
}
