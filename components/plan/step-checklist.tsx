"use client";

/**
 * Step 3: condition-aware packing checklist. buildPackingList() filters
 * the ~70-item gear catalog by trip length, season, terrain, and
 * difficulty, so a 2-day summer sand run and a 4-day alpine rock trail
 * produce visibly different lists. Items are grouped in the 8 gear
 * categories with a spring check-off animation, per-category counts, and
 * an animated progress ring.
 */
import { useMemo } from "react";
import { buildPackingList } from "@/lib/derive";
import { gear, gearCategories } from "@/lib/data/gear";
import type { GearCategory, GearItem, Season, Trail } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABEL, CategoryIcon } from "./plan-icons";
import { ProgressRing } from "./progress-ring";
import { SEASON_LABEL } from "./wizard-shared";
import styles from "./plan.module.css";

function itemWeightLbs(item: GearItem, partySize: number): number {
  return item.weightLbs * (item.qtyPerPerson ? Math.max(1, partySize) : 1);
}

function formatLbs(lbs: number): string {
  return `${lbs.toLocaleString("en-US", { maximumFractionDigits: 1 })} lb`;
}

function ChecklistRow({
  item,
  partySize,
  checked,
  onToggle,
}: {
  item: GearItem;
  partySize: number;
  checked: boolean;
  onToggle: () => void;
}) {
  const qty = item.qtyPerPerson ? Math.max(1, partySize) : 1;
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={onToggle}
        className="group flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-gunmetal-light/60"
      >
        <span
          aria-hidden
          className={`${styles.tickBox} mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
            checked
              ? "border-ember bg-ember"
              : "border-edge-strong bg-transparent group-hover:border-ember/60"
          }`}
        >
          {checked && (
            <span className={`${styles.tickPop} flex`}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path
                  className={styles.tickPath}
                  d="M2.5 7.5 5.5 10.5 11.5 3.5"
                  stroke="var(--color-basalt-deep)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block text-sm transition-colors duration-150 ${
              checked
                ? "text-sand-dim line-through decoration-edge-strong"
                : "text-sand"
            }`}
          >
            {item.name}
            {item.essential && (
              <span
                aria-hidden
                title="Essential"
                className="ml-2 inline-block h-1.5 w-1.5 rotate-45 bg-ember align-middle"
              />
            )}
            {item.essential && <span className="sr-only"> (essential)</span>}
          </span>
          {item.note && (
            <span className="mt-0.5 block text-xs leading-snug text-sand-dim">
              {item.note}
            </span>
          )}
        </span>
        <span className="readout shrink-0 pt-0.5 text-[0.7rem] text-sand-dim">
          {qty > 1 && <span className="mr-2 text-sand">×{qty}</span>}
          {formatLbs(itemWeightLbs(item, partySize))}
        </span>
      </button>
    </li>
  );
}

export function StepChecklist({
  trail,
  dayCount,
  season,
  partySize,
  checklist,
  onToggle,
  onClear,
}: {
  trail: Trail;
  dayCount: number;
  season: Season;
  partySize: number;
  checklist: Record<string, boolean>;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const items = useMemo(
    () => buildPackingList(trail, dayCount, season, partySize, gear),
    [trail, dayCount, season, partySize],
  );

  const grouped = useMemo(() => {
    const byCat = new Map<GearCategory, GearItem[]>();
    for (const cat of gearCategories) byCat.set(cat, []);
    for (const item of items) byCat.get(item.category)?.push(item);
    return gearCategories
      .map((cat) => ({ cat, items: byCat.get(cat) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [items]);

  const checkedCount = items.filter((i) => checklist[i.id]).length;
  const totalWeight = items.reduce((s, i) => s + itemWeightLbs(i, partySize), 0);
  const packedWeight = items
    .filter((i) => checklist[i.id])
    .reduce((s, i) => s + itemWeightLbs(i, partySize), 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Summary panel */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="card-surface flex flex-col items-center p-6 text-center">
          <ProgressRing checked={checkedCount} total={items.length} />
          <p className="readout mt-4 text-sm">
            {formatLbs(packedWeight)}{" "}
            <span className="text-sand-dim">/ {formatLbs(totalWeight)}</span>
          </p>
          <p className="stat-label mt-1">Packed weight</p>

          <div className="mt-5 w-full border-t border-edge pt-4">
            <p className="stat-label text-left">Built for</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="ember">
                {dayCount} day{dayCount === 1 ? "" : "s"}
              </Badge>
              <Badge tone="sand">{SEASON_LABEL[season]}</Badge>
              <Badge tone="sand">Party of {partySize}</Badge>
              <Badge tone="neutral">Difficulty {trail.difficulty}</Badge>
              {trail.terrain.map((t) => (
                <Badge key={t} tone="neutral">
                  {t.replace("-", " ")}
                </Badge>
              ))}
            </div>
          </div>

          <p className="mt-4 flex w-full items-center gap-2 border-t border-edge pt-4 text-left text-xs text-sand-dim">
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 shrink-0 rotate-45 bg-ember"
            />
            marks essential items. Pack these first.
          </p>

          {checkedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4"
              onClick={onClear}
            >
              Uncheck everything
            </Button>
          )}
        </div>
      </aside>

      {/* Categories */}
      <div className="flex flex-col gap-4">
        {grouped.map(({ cat, items: catItems }) => {
          const catChecked = catItems.filter((i) => checklist[i.id]).length;
          const done = catChecked === catItems.length;
          return (
            <section key={cat} aria-label={CATEGORY_LABEL[cat]} className="card-surface">
              <header className="flex items-center gap-3 border-b border-edge px-4 py-3">
                <CategoryIcon
                  category={cat}
                  size={18}
                  className={done ? "text-sage-bright" : "text-ember-bright"}
                />
                <h3 className="heading-display flex-1 text-base">
                  {CATEGORY_LABEL[cat]}
                </h3>
                <span
                  className={`readout text-xs ${done ? "text-sage-bright" : "text-sand-dim"}`}
                >
                  {catChecked} / {catItems.length}
                </span>
              </header>
              <div aria-hidden className="h-0.5 bg-basalt-deep">
                <div
                  className={`${styles.gaugeFill} h-full ${done ? "bg-sage" : "bg-ember"}`}
                  style={{ width: `${(catChecked / catItems.length) * 100}%` }}
                />
              </div>
              <ul className="divide-y divide-edge">
                {catItems.map((item) => (
                  <ChecklistRow
                    key={item.id}
                    item={item}
                    partySize={partySize}
                    checked={Boolean(checklist[item.id])}
                    onToggle={() => onToggle(item.id)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
