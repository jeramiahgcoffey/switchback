import { expect, test, type Page } from "@playwright/test";

const savedTrip = {
  id: "trip-field-packet",
  name: "Canyon Exit Packet",
  trailSlug: "white-rim-trail",
  startDate: "2026-10-02",
  partySize: 3,
  rigId: "rig-built-rubicon",
  rigBuildId: "rig-build-weekender",
  rigSnapshot: {
    buildId: "rig-build-weekender",
    buildName: "Desert Weekender",
    profile: {
      id: "rig-built-rubicon",
      name: "Built Rubicon",
      vehicle: "2024 Jeep Wrangler Rubicon",
      tireIn: 35,
      clearanceIn: 11.6,
      hasWinch: true,
      hasLockers: true,
      hasFourLo: true,
      fuelRangeMiles: 450,
      payloadLbs: 1218,
    },
    gearIds: ["gear-first-aid", "gear-offline-maps"],
  },
  days: [
    {
      day: 1,
      startWaypointId: "white-rim-trail--shafer-trailhead",
      endWaypointId: "white-rim-trail--white-crack-camp",
      miles: 49.9,
      estWheelHours: 4.2,
      campWaypointId: "white-rim-trail--white-crack-camp",
      resupplyWaypointIds: [],
    },
    {
      day: 2,
      startWaypointId: "white-rim-trail--white-crack-camp",
      endWaypointId: "white-rim-trail--candlestick-camp",
      miles: 28.6,
      estWheelHours: 2.4,
      campWaypointId: "white-rim-trail--candlestick-camp",
      resupplyWaypointIds: [],
    },
    {
      day: 3,
      startWaypointId: "white-rim-trail--candlestick-camp",
      endWaypointId: "white-rim-trail--horsethief-exit",
      miles: 21.5,
      estWheelHours: 1.8,
      campWaypointId: null,
      resupplyWaypointIds: ["white-rim-trail--green-river-access"],
    },
  ],
  checklist: {
    "gear-first-aid": true,
    "gear-offline-maps": true,
    "gear-headlamp": true,
  },
  fieldNotes: {
    tripLeader: "Mara Torres",
    emergencyContact: "Sam at basecamp",
    emergencyPhone: "+1 555 0100",
    checkInBy: "2026-10-04T18:30",
    notes: "Permit 42-WRT. Insulin in the blue fridge. Alternate exit at Shafer.",
  },
  createdAt: "2026-07-27T12:00:00.000Z",
};

async function seedSavedTrip(page: Page) {
  await page.addInitScript((trip) => {
    window.localStorage.setItem("switchback:trips:v1", JSON.stringify([trip]));
  }, savedTrip);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const printState = window as typeof window & {
      __switchbackPrintCalled?: boolean;
    };
    printState.__switchbackPrintCalled = false;
    Object.defineProperty(window, "print", {
      configurable: true,
      value: () => {
        printState.__switchbackPrintCalled = true;
      },
    });
  });
});

test("opens a complete saved-trip packet and invokes print/save PDF", async ({
  page,
}) => {
  await seedSavedTrip(page);
  await page.goto("/plan");
  const savedTrips = page.getByRole("region", { name: "Saved trips" });
  await savedTrips.getByRole("link", { name: "Packet" }).click();

  await expect(page).toHaveURL(/\/plan\/packet\/trip-field-packet$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Canyon Exit Packet" }),
  ).toBeVisible();
  await expect(page.getByText("Planning only — do not navigate from this packet")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Day-by-day itinerary" }),
  ).toBeVisible();
  await expect(page.getByText("Mara Torres")).toBeVisible();
  await expect(page.getByText("Sam at basecamp")).toBeVisible();
  await expect(page.getByText("Desert Weekender")).toBeVisible();
  await expect(page.getByText("Permit 42-WRT.")).toBeVisible();
  await expect(page.getByRole("table", { name: "Route waypoints" })).toContainText(
    "Murphy Hogback",
  );

  await page.getByRole("button", { name: "Print / save PDF" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __switchbackPrintCalled?: boolean })
            .__switchbackPrintCalled,
      ),
    )
    .toBe(true);
});

test("carries field details from the builder into a newly saved packet", async ({
  page,
}) => {
  await page.goto("/plan?trail=white-rim-trail");

  await page.getByRole("button", { name: "Build itinerary" }).click();
  await page.getByRole("button", { name: "Build pack list" }).click();
  await page.getByLabel("Trip leader").fill("Riley Chen");
  await page.getByLabel("Emergency contact").fill("Morgan at basecamp");
  await page
    .getByLabel("Crew, permit, medical, meetup, and weather notes")
    .fill("Permit WRT-88. Two vehicles. Call by sunset.");
  await page.getByRole("button", { name: "Save this trip" }).click();

  await page
    .getByRole("region", { name: "Saved trips" })
    .getByRole("link", { name: "Packet" })
    .click();

  await expect(page.getByText("Riley Chen")).toBeVisible();
  await expect(page.getByText("Morgan at basecamp")).toBeVisible();
  await expect(page.getByText("Permit WRT-88.")).toBeVisible();
});

test("creates, copies, and revokes an anonymous shared brief", async ({
  page,
  context,
}) => {
  const shareId = "AbCdEf0123456789_-abCDef";
  let createBody: Record<string, unknown> | null = null;
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.route("**/api/auth/get-session", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        session: {
          id: "session-share-test",
          userId: "user-share-test",
          token: "test-token",
          expiresAt: "2026-08-31T12:00:00.000Z",
        },
        user: {
          id: "user-share-test",
          name: "Trail Planner",
          email: "planner@example.com",
          emailVerified: true,
          createdAt: "2026-07-01T12:00:00.000Z",
          updatedAt: "2026-07-01T12:00:00.000Z",
        },
      }),
    }),
  );
  await page.route("**/api/shared-trips**", async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      await route.fulfill({ json: { shares: [] } });
      return;
    }
    if (request.method() === "POST") {
      createBody = request.postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        json: {
          share: {
            shareId,
            sourceTripId: savedTrip.id,
            title: savedTrip.name,
            trailSlug: savedTrip.trailSlug,
            createdAt: "2026-07-31T12:00:00.000Z",
            expiresAt: "2026-08-30T12:00:00.000Z",
            revokedAt: null,
            viewCount: 0,
            lastViewedAt: null,
          },
        },
      });
      return;
    }
    await route.fulfill({ json: { revoked: true } });
  });
  await seedSavedTrip(page);
  await page.goto(`/plan/packet/${savedTrip.id}`);

  await page.getByRole("button", { name: "Share brief" }).click();
  await expect(
    page.getByRole("heading", { name: "Share this trip brief" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create share link" }).click();

  await expect(page.getByText(`/share/${shareId}`)).toBeVisible();
  await expect(page.getByText(/Link copied/)).toBeVisible();
  expect(createBody).toMatchObject({
    expiresInDays: 30,
    includeFieldNotes: false,
  });

  await page.getByRole("button", { name: "Revoke" }).click();
  await expect(page.getByText("Revoked")).toBeVisible();
});

test("keeps the packet usable at a narrow field viewport", async ({ page }) => {
  await seedSavedTrip(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/plan/packet/trip-field-packet");

  await expect(
    page.getByRole("heading", { level: 1, name: "Canyon Exit Packet" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("explains when a packet is not available on this device", async ({
  page,
}) => {
  await page.goto("/plan/packet/missing-trip");

  await expect(
    page.getByRole("heading", { name: "Saved trip not found" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to Trip Builder" })).toBeVisible();
});
