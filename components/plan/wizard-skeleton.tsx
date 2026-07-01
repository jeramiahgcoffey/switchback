/**
 * Loading/hydration placeholder for the Trip Wizard, shown while the
 * route segment streams in and again while localStorage state hydrates,
 * so the layout never jumps.
 */
export function WizardSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="mx-auto flex max-w-xl items-center justify-between px-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 rotate-45 rounded-[3px] bg-gunmetal-light" />
            <div className="h-3 w-20 rounded bg-gunmetal-light" />
          </div>
        ))}
      </div>
      <div className="card-surface mt-10 p-6">
        <div className="h-4 w-40 rounded bg-gunmetal-light" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-gunmetal-light" />
          ))}
        </div>
        <div className="mt-6 h-10 w-48 rounded bg-gunmetal-light" />
      </div>
    </div>
  );
}
