import { expect, test } from "@playwright/test";

test("creates, renames, duplicates, and persists saved rigs", async ({
  page,
}) => {
  await page.goto("/garage");

  await expect(page.getByRole("region", { name: "Saved rigs" })).toContainText(
    "1 named build",
  );
  await page.getByRole("button", { name: "New rig" }).click();

  const newRig = page.getByRole("listitem").filter({ hasText: "Rig 2" });
  await newRig.getByRole("button", { name: "Rename" }).click();
  const nameInput = page.getByRole("textbox", { name: "Rig name" });
  await nameInput.fill("Desert Weekender");
  await nameInput.press("Enter");
  const renamedRig = page
    .getByRole("listitem")
    .filter({ hasText: "Desert Weekender" });
  await expect(renamedRig).toContainText("Desert Weekender");

  await renamedRig.getByRole("button", { name: "Duplicate" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Desert Weekender Copy" }),
  ).toContainText("Active");

  await page.reload();
  await expect(page.getByRole("region", { name: "Saved rigs" })).toContainText(
    "3 named builds",
  );
  await expect(page.getByText("Desert Weekender Copy")).toBeVisible();
});

test("migrates the legacy single-rig storage record", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "switchback:rig:v1",
      JSON.stringify({
        rigId: "rig-built-rubicon",
        customSpecs: { tireIn: 37 },
        gearIds: ["gear-water"],
      }),
    );
  });

  await page.goto("/garage");

  const migrated = page
    .getByRole("listitem")
    .filter({ hasText: "Built Rubicon" });
  await expect(migrated).toContainText('37" tires');
  await expect(migrated).toContainText("Active");
});

test("fits the Garage at a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/garage");

  await expect(page.getByRole("region", { name: "Saved rigs" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
