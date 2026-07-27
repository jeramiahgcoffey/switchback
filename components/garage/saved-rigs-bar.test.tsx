import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SavedRigsBar } from "@/components/garage/saved-rigs-bar";

const build = {
  id: "weekend-rig",
  name: "Weekend Rubicon",
  rig: {
    rigId: "rig-built-rubicon",
    gearIds: ["water"],
  },
  createdAt: "2026-07-27T12:00:00.000Z",
  updatedAt: "2026-07-27T12:00:00.000Z",
};

describe("SavedRigsBar", () => {
  it("renames a build and exposes the active state", () => {
    const onRename = vi.fn();
    render(
      <SavedRigsBar
        rigs={[build]}
        activeRigId={build.id}
        onCreate={vi.fn()}
        onDuplicate={vi.fn()}
        onActivate={vi.fn()}
        onRename={onRename}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    const input = screen.getByRole("textbox", { name: "Rig name" });
    fireEvent.change(input, { target: { value: "Desert Weekender" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onRename).toHaveBeenCalledWith("weekend-rig", "Desert Weekender");
  });
});
