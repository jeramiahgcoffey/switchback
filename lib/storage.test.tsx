import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  RIG_LIBRARY_STORAGE_KEY,
  RIG_STORAGE_KEY,
  useRigLibrary,
} from "@/lib/storage";
import { MAX_RIG_BUILDS } from "@/lib/rig-library";
import type { RigBuild, RigLibraryState } from "@/lib/types";

const timestamp = "2026-07-27T12:00:00.000Z";

function build(index: number): RigBuild {
  return {
    id: `build-${index}`,
    name: `Build ${index}`,
    rig: {
      rigId: "rig-built-rubicon",
      gearIds: [`gear-${index}`],
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function seedLibrary(library: RigLibraryState) {
  window.localStorage.setItem(
    RIG_LIBRARY_STORAGE_KEY,
    JSON.stringify(library),
  );
}

describe.sequential("useRigLibrary", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("migrates the legacy rig before exposing the library as hydrated", async () => {
    window.localStorage.setItem(
      RIG_STORAGE_KEY,
      JSON.stringify({
        rigId: "rig-built-rubicon",
        customSpecs: { tireIn: 37 },
        gearIds: ["gear-water"],
      }),
    );

    const { result } = renderHook(() => useRigLibrary());

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.library.rigs).toHaveLength(1);
    expect(result.current.activeBuild.rig).toMatchObject({
      rigId: "rig-built-rubicon",
      customSpecs: { tireIn: 37 },
      gearIds: ["gear-water"],
    });
    expect(window.localStorage.getItem(RIG_LIBRARY_STORAGE_KEY)).not.toBeNull();
  });

  it("refuses create and duplicate mutations at the library cap", async () => {
    const rigs = Array.from({ length: MAX_RIG_BUILDS }, (_, index) =>
      build(index),
    );
    seedLibrary({ activeRigId: rigs[0].id, rigs });
    const { result } = renderHook(() => useRigLibrary());
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.createRig());
    act(() => result.current.duplicateRig(rigs[0].id));

    expect(result.current.library.rigs).toHaveLength(MAX_RIG_BUILDS);
  });

  it("reassigns the active build when removing it", async () => {
    const rigs = [build(1), build(2)];
    seedLibrary({ activeRigId: rigs[0].id, rigs });
    const { result } = renderHook(() => useRigLibrary());
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.removeRig(rigs[0].id));

    expect(result.current.library.rigs).toEqual([rigs[1]]);
    expect(result.current.library.activeRigId).toBe(rigs[1].id);
  });

  it("persists the fallback build when the active id is dangling", async () => {
    const rigs = [build(1), build(2)];
    seedLibrary({ activeRigId: "missing-build", rigs });
    const { result } = renderHook(() => useRigLibrary());

    await waitFor(() =>
      expect(result.current.library.activeRigId).toBe(rigs[0].id),
    );
    const stored = JSON.parse(
      window.localStorage.getItem(RIG_LIBRARY_STORAGE_KEY) ?? "{}",
    ) as RigLibraryState;
    expect(stored.activeRigId).toBe(rigs[0].id);
  });
});
