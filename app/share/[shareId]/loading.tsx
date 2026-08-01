export default function SharedTripLoading() {
  return (
    <div
      className="mx-auto my-8 grid min-h-[48rem] w-[calc(100%-2rem)] max-w-6xl gap-4 bg-gunmetal p-8"
      aria-label="Loading shared trip brief"
    >
      <div className="h-20 animate-pulse rounded bg-gunmetal-light" />
      <div className="h-48 animate-pulse rounded bg-gunmetal-light" />
      <div className="h-64 animate-pulse rounded bg-gunmetal-light" />
    </div>
  );
}
