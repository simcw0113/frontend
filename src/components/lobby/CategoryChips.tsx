"use client";

import { useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Dictionary } from "@/i18n";
import { LOBBY_ALL_CATEGORY, type LobbyProductCategory } from "@/lib/lobbyApi";

// Horizontal category chips, same pattern as the Explore search pop-up tabs:
// a tablist of rounded, non-wrapping buttons, the selected one in brand, with
// arrow-key roving tabindex.

export type CategoryChip = {
  id: string;
  label: string;
  icon?: "grid";
};

type CategoryLabels = Dictionary["search"]["categories"];

function normalizeCategoryName(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

// Backend GET /config product titles are often English even when locale=cn.
// Map known names and category ids to i18n keys; otherwise keep the backend title.
const CATEGORY_ALIASES: Record<string, keyof CategoryLabels> = {
  all: "all",
  "all games": "all",
  slots: "slots",
  slot: "slots",
  "live dealer": "liveDealer",
  "live dealer games": "liveDealer",
  "live casino": "liveCasino",
  lottery: "lottery",
  fishing: "fishing",
  "fishing games": "fishing",
  "fast game": "fastGame",
  "fast games": "fastGame",
  baccarat: "baccarat",
  blackjack: "blackjack",
  roulette: "roulette",
  "game shows": "gameShows",
  "game show": "gameShows",
  "sic bo": "sicBo",
  sicbo: "sicBo",
};

const CATEGORY_IDS: Record<number, keyof CategoryLabels> = {
  [LOBBY_ALL_CATEGORY]: "all",
  1: "liveDealer",
  3: "slots",
  4: "lottery",
  5: "fishing",
  11: "fastGame",
};

export function productCategoryLabel(item: LobbyProductCategory, allLabel: string, labels: CategoryLabels): string {
  if (item.id === LOBBY_ALL_CATEGORY) return allLabel;
  const key = CATEGORY_ALIASES[normalizeCategoryName(item.title)] ?? CATEGORY_IDS[item.id];
  if (key && labels[key]) return labels[key];
  return item.title || String(item.id);
}

export function toCategoryChips(
  categories: LobbyProductCategory[],
  allLabel: string,
  labels: CategoryLabels,
): CategoryChip[] {
  return categories.map((item) => ({
    id: String(item.id),
    label: productCategoryLabel(item, allLabel, labels),
    icon: item.id === LOBBY_ALL_CATEGORY ? "grid" : undefined,
  }));
}


const ROW = "flex shrink-0 gap-1 overflow-x-auto";
const CHIP =
  "flex h-10 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand";

export function CategoryChips({
  items,
  value,
  onChange,
  label,
  idPrefix = "category",
  panelId,
  className,
}: {
  items: CategoryChip[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  idPrefix?: string;
  panelId?: string;
  className?: string;
}) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function select(index: number, focus = false) {
    if (items.length === 0) return;
    const next = items[(index + items.length) % items.length];
    onChange(next.id);
    if (focus) {
      const tab = tabs.current[items.findIndex((item) => item.id === next.id)];
      tab?.focus();
      tab?.scrollIntoView({ inline: "nearest", block: "nearest" });
    }
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const index = items.findIndex((item) => item.id === value);
    const move: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: items.length - 1,
    };
    if (!(event.key in move)) return;
    event.preventDefault();
    select(move[event.key], true);
  }

  if (items.length === 0) return null;

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className={className ? `${ROW} ${className}` : `explore-tabs ${ROW}`}>
      {items.map((item, index) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${item.id}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={`${CHIP} ${selected ? "bg-brand/15 text-brand" : "text-muted hover:bg-white/5 hover:text-white"}`}
          >
            {item.icon === "grid" ? <GridIcon /> : null}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}
