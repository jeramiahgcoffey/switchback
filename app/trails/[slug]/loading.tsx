/** Skeleton for the trail detail route — mirrors hero, stat band, and grid. */
export default function TrailDetailLoading() {
  return (
    <div aria-busy="true" aria-label="Loading trail">
      <section className="border-b border-edge">
        <div className="mx-auto max-w-6xl animate-pulse px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14">
          <div className="h-3 w-20 rounded bg-gunmetal-light" />
          <div className="mt-7 flex gap-2.5">
            <div className="h-7 w-36 rounded bg-gunmetal-light" />
            <div className="h-7 w-28 rounded bg-gunmetal-light" />
          </div>
          <div className="mt-5 h-14 w-2/3 rounded bg-gunmetal-light" />
          <div className="mt-4 h-4 w-56 rounded bg-gunmetal-light" />
          <div className="mt-5 h-5 w-full max-w-2xl rounded bg-gunmetal-light" />
        </div>
      </section>

      <section className="border-b border-edge bg-basalt-deep">
        <div className="mx-auto grid max-w-6xl animate-pulse grid-cols-2 gap-px sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-6 sm:px-6 sm:py-7">
              <div className="h-8 w-24 rounded bg-gunmetal-light" />
              <div className="mt-2 h-3 w-20 rounded bg-gunmetal-light" />
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid animate-pulse gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <div className="h-[340px] rounded-lg border border-edge bg-gunmetal sm:h-[440px]" />
            <div className="h-72 rounded-lg border border-edge bg-gunmetal" />
            <div className="h-96 rounded-lg border border-edge bg-gunmetal" />
          </div>
          <div className="space-y-6">
            <div className="h-96 rounded-lg border border-edge bg-gunmetal" />
            <div className="h-72 rounded-lg border border-edge bg-gunmetal" />
          </div>
        </div>
      </div>
    </div>
  );
}
