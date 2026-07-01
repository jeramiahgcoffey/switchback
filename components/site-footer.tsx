import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-edge bg-basalt-deep">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <p className="heading-display text-lg">Switchback</p>
            <p className="mt-2 text-sm text-sand-dim">
              Plan the route. Ready the rig. Chase the weekend.
            </p>
          </div>
          <nav aria-label="Footer" className="flex gap-12">
            <div>
              <p className="stat-label mb-3">Explore</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/trails" className="text-sand transition-colors hover:text-ember-bright">
                    Trail Explorer
                  </Link>
                </li>
                <li>
                  <Link href="/plan" className="text-sand transition-colors hover:text-ember-bright">
                    Trip Builder
                  </Link>
                </li>
                <li>
                  <Link href="/garage" className="text-sand transition-colors hover:text-ember-bright">
                    Rig &amp; Loadout
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="stat-label mb-3">Basecamp</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/" className="text-sand transition-colors hover:text-ember-bright">
                    Home
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>
        <hr className="divider-route my-8" />
        <div className="flex flex-col gap-2 text-xs text-sand-dim sm:flex-row sm:items-center sm:justify-between">
          <p>
            Trail tracks, waypoints, and elevations are illustrative demo data —
            not for navigation.
          </p>
          <p className="readout text-xs text-sand-dim">
            38.5733 N 109.5498 W — basecamp
          </p>
        </div>
      </div>
    </footer>
  );
}
