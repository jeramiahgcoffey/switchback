/**
 * Gear catalog — ~70 items across 8 categories with realistic weights.
 * Items with `conditions` are only pulled onto a packing list when the trip
 * matches (see `buildPackingList()` in lib/derive.ts — all specified
 * conditions must match). `qtyPerPerson` items scale with party size.
 */
import type { GearItem } from "@/lib/types";

export const gear = [
  // ---------- recovery ----------
  { id: "gear-folding-shovel", name: "Folding shovel", category: "recovery", weightLbs: 6, essential: true },
  { id: "gear-work-gloves", name: "Work gloves", category: "recovery", weightLbs: 1, essential: true },
  { id: "gear-recovery-boards", name: "Recovery boards (pair)", category: "recovery", weightLbs: 15, essential: true, conditions: { terrain: ["sand", "mud", "water-crossing"] }, note: "Self-recovery in sand and mud — the first thing off the rack." },
  { id: "gear-kinetic-rope", name: "Kinetic recovery rope 7/8\"", category: "recovery", weightLbs: 18, essential: true, conditions: { minDifficulty: 2 } },
  { id: "gear-soft-shackles", name: "Soft shackles (pair)", category: "recovery", weightLbs: 1, essential: true, conditions: { minDifficulty: 2 } },
  { id: "gear-tree-saver", name: "Tree saver strap", category: "recovery", weightLbs: 5, essential: false, conditions: { minDifficulty: 3, terrain: ["forest", "rock-garden"] } },
  { id: "gear-snatch-block", name: "Snatch block", category: "recovery", weightLbs: 8, essential: false, conditions: { minDifficulty: 4 } },
  { id: "gear-hi-lift", name: "Hi-Lift jack 48\"", category: "recovery", weightLbs: 30, essential: false, conditions: { minDifficulty: 3 }, note: "Heavy but versatile: jack, clamp, come-along." },
  { id: "gear-winch-damper", name: "Winch line damper", category: "recovery", weightLbs: 2, essential: false, conditions: { minDifficulty: 4 } },
  { id: "gear-base-plate", name: "Jack base plate", category: "recovery", weightLbs: 4, essential: false, conditions: { minDifficulty: 3, terrain: ["sand", "mud", "desert"] } },

  // ---------- camp ----------
  { id: "gear-headlamp", name: "Headlamp", category: "camp", weightLbs: 0.3, essential: true, qtyPerPerson: true },
  { id: "gear-rtt", name: "Rooftop tent", category: "camp", weightLbs: 130, essential: true, conditions: { minDays: 2 }, note: "The single heaviest item on the truck — payload math starts here." },
  { id: "gear-sleeping-bag", name: "Sleeping bag (20°F)", category: "camp", weightLbs: 4, essential: true, qtyPerPerson: true, conditions: { minDays: 2 } },
  { id: "gear-sleeping-pad", name: "Sleeping pad", category: "camp", weightLbs: 2, essential: true, qtyPerPerson: true, conditions: { minDays: 2 } },
  { id: "gear-bag-liner", name: "Cold-weather bag liner", category: "camp", weightLbs: 1.5, essential: false, qtyPerPerson: true, conditions: { minDays: 2, seasons: ["fall", "winter"] } },
  { id: "gear-camp-chair", name: "Camp chair", category: "camp", weightLbs: 8, essential: false, qtyPerPerson: true, conditions: { minDays: 2 } },
  { id: "gear-camp-table", name: "Camp table", category: "camp", weightLbs: 12, essential: false, conditions: { minDays: 2 } },
  { id: "gear-awning", name: "270° awning", category: "camp", weightLbs: 35, essential: false, conditions: { minDays: 2, terrain: ["desert", "sand", "slickrock"] }, note: "Shade is survival gear in the desert." },
  { id: "gear-lantern", name: "Rechargeable lantern", category: "camp", weightLbs: 1.5, essential: false, conditions: { minDays: 2 } },
  { id: "gear-firewood", name: "Firewood (bundle)", category: "camp", weightLbs: 40, essential: false, conditions: { minDays: 2 }, note: "Buy where you burn — check fire restrictions." },
  { id: "gear-ground-tarp", name: "Ground tarp", category: "camp", weightLbs: 3, essential: false, conditions: { minDays: 2 } },

  // ---------- kitchen ----------
  { id: "gear-day-snacks", name: "Trail snacks", category: "kitchen", weightLbs: 2, essential: true, qtyPerPerson: true },
  { id: "gear-stove", name: "Two-burner camp stove", category: "kitchen", weightLbs: 12, essential: true, conditions: { minDays: 2 } },
  { id: "gear-stove-fuel", name: "Propane canisters (2)", category: "kitchen", weightLbs: 4, essential: true, conditions: { minDays: 2 } },
  { id: "gear-fridge", name: "12V fridge (45L)", category: "kitchen", weightLbs: 50, essential: false, conditions: { minDays: 2 }, note: "Loaded weight — figure another 30 lb of food and ice-cold cans." },
  { id: "gear-cook-kit", name: "Cook kit (pots/pan)", category: "kitchen", weightLbs: 6, essential: true, conditions: { minDays: 2 } },
  { id: "gear-utensils", name: "Utensil + knife roll", category: "kitchen", weightLbs: 2, essential: true, conditions: { minDays: 2 } },
  { id: "gear-coffee-kit", name: "Coffee kit", category: "kitchen", weightLbs: 3, essential: false, note: "Non-negotiable for some crews." },
  { id: "gear-food-bin", name: "Dry food bin", category: "kitchen", weightLbs: 25, essential: true, conditions: { minDays: 2 } },
  { id: "gear-trasharoo", name: "Spare-tire trash bag", category: "kitchen", weightLbs: 3, essential: true, conditions: { minDays: 2 }, note: "Pack it in, pack it out." },
  { id: "gear-wash-kit", name: "Camp wash kit", category: "kitchen", weightLbs: 2, essential: false, conditions: { minDays: 2 } },

  // ---------- water ----------
  { id: "gear-drinking-water", name: "Drinking water (1 gal/person/day)", category: "water", weightLbs: 8.3, essential: true, qtyPerPerson: true, note: "8.3 lb per gallon — the honest line item most payload math forgets. Scale by trip days." },
  { id: "gear-water-cube", name: "7-gal water container (full)", category: "water", weightLbs: 62, essential: true, conditions: { minDays: 2 } },
  { id: "gear-water-filter", name: "Water filter", category: "water", weightLbs: 1.5, essential: false, conditions: { minDays: 3 }, note: "Only worth carrying where there's water to filter." },
  { id: "gear-electrolytes", name: "Electrolyte mix", category: "water", weightLbs: 1, essential: false, qtyPerPerson: true, conditions: { seasons: ["summer"], terrain: ["desert", "sand", "slickrock"] } },
  { id: "gear-jerry-water", name: "Extra 5-gal jerry (full)", category: "water", weightLbs: 45, essential: false, conditions: { minDays: 3, terrain: ["desert", "sand"] }, note: "Desert margin — dead weight everywhere else." },

  // ---------- comms ----------
  { id: "gear-gmrs", name: "GMRS handheld radio", category: "comms", weightLbs: 1.5, essential: true, note: "Trail channel 16. License required, test not." },
  { id: "gear-offline-maps", name: "Phone mount + offline maps", category: "comms", weightLbs: 0.5, essential: true, note: "Download tiles before you lose signal, not after." },
  { id: "gear-sat-messenger", name: "Satellite messenger", category: "comms", weightLbs: 0.3, essential: true, conditions: { minDifficulty: 3 }, note: "When the map says 'no coverage', this is the plan." },
  { id: "gear-charge-hub", name: "12V charging hub", category: "comms", weightLbs: 1, essential: false },
  { id: "gear-battery-bank", name: "Power bank (20k mAh)", category: "comms", weightLbs: 1.5, essential: false },
  { id: "gear-paper-maps", name: "Paper maps + compass", category: "comms", weightLbs: 0.5, essential: false, conditions: { minDifficulty: 3 } },

  // ---------- tools-spares ----------
  { id: "gear-full-spare", name: "Full-size spare (mounted)", category: "tools-spares", weightLbs: 75, essential: true },
  { id: "gear-tire-repair", name: "Tire repair kit", category: "tools-spares", weightLbs: 2, essential: true },
  { id: "gear-compressor", name: "12V air compressor", category: "tools-spares", weightLbs: 12, essential: true, note: "Air down at the trailhead, air up at the exit." },
  { id: "gear-deflators", name: "Tire deflators", category: "tools-spares", weightLbs: 0.5, essential: true },
  { id: "gear-tool-roll", name: "Tool roll (metric + SAE)", category: "tools-spares", weightLbs: 15, essential: true },
  { id: "gear-serp-belt", name: "Spare serpentine belt", category: "tools-spares", weightLbs: 2, essential: false, conditions: { minDifficulty: 3 } },
  { id: "gear-fluids-kit", name: "Fluids kit (oil/coolant/ATF)", category: "tools-spares", weightLbs: 15, essential: false, conditions: { minDays: 2 } },
  { id: "gear-steering-spares", name: "Tie-rod + ball-joint spares", category: "tools-spares", weightLbs: 12, essential: false, conditions: { minDifficulty: 4 }, note: "Rock trails eat steering. Ask anyone leaving the Rubicon on a strap." },
  { id: "gear-fix-kit", name: "Zip ties / wire / tape kit", category: "tools-spares", weightLbs: 3, essential: true },
  { id: "gear-multimeter", name: "Multimeter + fuse kit", category: "tools-spares", weightLbs: 2, essential: false },

  // ---------- safety ----------
  { id: "gear-first-aid", name: "Group first-aid kit", category: "safety", weightLbs: 5, essential: true },
  { id: "gear-extinguisher", name: "Fire extinguisher (2.5 lb)", category: "safety", weightLbs: 6, essential: true },
  { id: "gear-roadside-kit", name: "Flares + triangle kit", category: "safety", weightLbs: 4, essential: false },
  { id: "gear-snow-chains", name: "Snow chains", category: "safety", weightLbs: 40, essential: false, conditions: { seasons: ["winter"] } },
  { id: "gear-emergency-blanket", name: "Emergency blanket", category: "safety", weightLbs: 0.5, essential: false, qtyPerPerson: true, conditions: { seasons: ["fall", "winter"] } },
  { id: "gear-bear-bag", name: "Bear bag + line", category: "safety", weightLbs: 3, essential: false, conditions: { terrain: ["forest", "alpine"] } },
  { id: "gear-sunscreen", name: "Sunscreen SPF 50", category: "safety", weightLbs: 0.5, essential: true, conditions: { terrain: ["desert", "sand", "slickrock", "alpine"] } },
  { id: "gear-bug-spray", name: "Bug spray", category: "safety", weightLbs: 0.5, essential: false, conditions: { seasons: ["spring", "summer"], terrain: ["forest", "mud", "water-crossing"] } },

  // ---------- personal ----------
  { id: "gear-clothing-duffel", name: "Clothing duffel", category: "personal", weightLbs: 15, essential: true, qtyPerPerson: true },
  { id: "gear-rain-shell", name: "Rain shell", category: "personal", weightLbs: 1, essential: true, qtyPerPerson: true },
  { id: "gear-puffy", name: "Insulated jacket", category: "personal", weightLbs: 2, essential: true, qtyPerPerson: true, conditions: { terrain: ["alpine"] }, note: "Alpine nights drop below freezing in July." },
  { id: "gear-winter-parka", name: "Winter parka", category: "personal", weightLbs: 3, essential: true, qtyPerPerson: true, conditions: { seasons: ["winter"] } },
  { id: "gear-boots", name: "Hiking boots", category: "personal", weightLbs: 3, essential: false, qtyPerPerson: true },
  { id: "gear-toiletries", name: "Toiletry kit", category: "personal", weightLbs: 2, essential: true, qtyPerPerson: true },
  { id: "gear-camera-kit", name: "Camera kit", category: "personal", weightLbs: 8, essential: false },
  { id: "gear-swim-towel", name: "Swimsuit + towel", category: "personal", weightLbs: 1, essential: false, qtyPerPerson: true, conditions: { seasons: ["summer"] } },
  { id: "gear-sun-hat", name: "Sun hat", category: "personal", weightLbs: 0.5, essential: false, qtyPerPerson: true, conditions: { seasons: ["summer"] } },
] satisfies GearItem[];

export function getGearById(id: string): GearItem | undefined {
  return gear.find((g) => g.id === id);
}

export const gearCategories = [
  "recovery",
  "camp",
  "kitchen",
  "water",
  "comms",
  "tools-spares",
  "safety",
  "personal",
] as const;
