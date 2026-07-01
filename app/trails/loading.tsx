import { ExplorerHeader, ExplorerSkeleton } from "@/components/explorer/explorer-skeleton";

/** Route-level loading UI — paints the same frame the page resolves into. */
export default function TrailsLoading() {
  return (
    <div>
      <ExplorerHeader />
      <ExplorerSkeleton />
    </div>
  );
}
