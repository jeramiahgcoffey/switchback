import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Offline Field Mode",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <section className="bg-topo mx-auto my-10 w-[calc(100%-2rem)] max-w-3xl overflow-hidden rounded-lg border border-edge bg-gunmetal/80 shadow-2xl">
      <header className="border-b border-edge px-6 py-6 sm:px-8">
        <p className="stat-label text-sage-bright">Field cache</p>
        <h1 className="heading-display mt-2 text-4xl sm:text-5xl">
          You’re off the network
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-sand-dim">
          Open a Trip Packet you previously saved with Offline Field Mode. Its
          packing and departure checks continue to work on this device.
        </p>
      </header>
      <div className="grid gap-6 px-6 py-7 sm:grid-cols-2 sm:px-8">
        <div>
          <h2 className="heading-display text-xl">Available offline</h2>
          <ul className="mt-3 space-y-2 text-sm text-sand">
            <li>Saved field packets</li>
            <li>Frozen rig and loadout summaries</li>
            <li>Selected trail summaries</li>
            <li>Device-local packing and departure checks</li>
          </ul>
        </div>
        <div>
          <h2 className="heading-display text-xl text-ember-bright">
            Not a navigation source
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-sand-dim">
            Map tiles, closures, weather, live conditions, directions, and
            emergency communications are not included. Use current dedicated
            offline maps and independent communications in the field.
          </p>
        </div>
      </div>
      <footer className="flex flex-wrap gap-2 border-t border-edge px-6 py-5 sm:px-8">
        <Button href="/plan">Open trip library</Button>
        <Button href="/trails" variant="outline">
          Browse cached trails
        </Button>
      </footer>
    </section>
  );
}
