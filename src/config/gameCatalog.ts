import {
  houseGames,
  liveGames,
  slotGames,
  slotsGames,
  type Game,
  type GameSymbol,
} from "@/config/lobby";
import type { SearchCategoryId } from "@/config/searchCategories";

// FAKE static catalog for the "Explore" search (about 80 games). Used only while
// there is no API address (apiConfig.useStaticGames); lib/games.ts#searchGames
// filters and pages it. Deterministic: same list on every build and request.
// Existing lobby games are reused, the rest is generated from name lists. Every
// game carries category tags that the chips filter on ("live-casino" also
// includes the table-game chips). House games only show under "All Games".
export type CatalogGame = Game & { categories: Exclude<SearchCategoryId, "all">[] };

function hash(text: string) {
  let h = 0;
  for (const char of text) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}

const PROVIDERS = [
  "Pragmatic Play",
  "Evolution",
  "Jili",
  "PG Soft",
  "Hacksaw",
  "Playtech",
  "Red Tiger",
  "Nolimit City",
  "Habanero",
  "Relax",
];
const PALETTE: [string, string][] = [
  ["#f59e0b", "#7c2d12"],
  ["#16a34a", "#14532d"],
  ["#0ea5e9", "#0c4a6e"],
  ["#a855f7", "#3b0764"],
  ["#ef4444", "#7f1d1d"],
  ["#6366f1", "#1e1b4b"],
  ["#ec4899", "#831843"],
  ["#14b8a6", "#134e4a"],
];

type Spec = {
  category: Exclude<SearchCategoryId, "all">;
  also: Exclude<SearchCategoryId, "all">[];
  symbols: GameSymbol[];
  names: string[];
};

const live = "live-casino" as const;
const SPECS: Spec[] = [
  {
    category: "slots",
    also: [],
    symbols: ["reel", "seven", "star", "coin", "crown", "lantern", "tiger", "pig", "ape", "ghost"],
    names: [
      "Gates of Fortune", "Sugar Rush Deluxe", "Aztec Totem", "Duck Hunters", "Le Bandit",
      "Shark Boss", "Mortal Monarch", "Treasure Raiders", "Super Elements", "Jade Legends",
      "Chests of Fortune", "Sweet Bonanza Pop",
    ],
  },
  {
    category: "baccarat",
    also: [live],
    symbols: ["table", "cards"],
    names: ["Speed Baccarat", "Lightning Baccarat", "Golden Wealth Baccarat", "No Commission Baccarat", "Baccarat Squeeze", "Dragon Baccarat"],
  },
  {
    category: "blackjack",
    also: [live],
    symbols: ["cards", "table"],
    names: ["Blackjack Party", "VIP Blackjack", "Infinite Blackjack", "Speed Blackjack", "Platinum Blackjack"],
  },
  {
    category: "roulette",
    also: [live],
    symbols: ["table", "ball"],
    names: ["Auto Roulette", "Lightning Roulette", "Immersive Roulette", "Speed Roulette", "Gold Vault Roulette", "Mini Roulette"],
  },
  {
    category: "game-shows",
    also: [live],
    symbols: ["orbit", "star", "coin"],
    names: ["Mega Wheel Live", "Cash Hunt Live", "Crazy Spin Live", "Dream Drop", "Fortune Wheel Show", "Money Drop Live"],
  },
  {
    category: "sic-bo",
    also: [live],
    symbols: ["block", "coin"],
    names: ["Sic Bo Deluxe", "Super Sic Bo", "Golden Dice Sic Bo", "Fast Sic Bo", "Dragon Dice", "Sic Bo Royale"],
  },
  {
    category: "roulette", // extra live-casino lobby tables
    also: [live],
    symbols: ["table"],
    names: [],
  },
];

function generated(): CatalogGame[] {
  const games: CatalogGame[] = [];
  for (const spec of SPECS) {
    for (const [index, title] of spec.names.entries()) {
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const seed = hash(id);
      const [from, to] = PALETTE[seed % PALETTE.length];
      games.push({
        id,
        title,
        provider: PROVIDERS[(seed + index) % PROVIDERS.length],
        playing: 3 + (seed % 178),
        tags: spec.category === "slots" ? ["slots"] : ["live"],
        from,
        to,
        symbol: spec.symbols[seed % spec.symbols.length],
        categories: [spec.category, ...spec.also],
      });
    }
  }
  return games;
}

function existing(): CatalogGame[] {
  const liveCategory: Record<string, Exclude<SearchCategoryId, "all">> = {
    "live-roulette": "roulette",
    "live-blackjack": "blackjack",
    "live-baccarat": "baccarat",
  };
  return [
    ...slotsGames.map((game) => ({ ...game, categories: ["slots" as const] })),
    ...slotGames.map((game) => ({ ...game, categories: ["slots" as const] })),
    ...liveGames.map((game) => ({ ...game, categories: [liveCategory[game.id], live] })),
    ...houseGames.map((game) => ({ ...game, categories: [] })),
  ];
}

// Pseudo-shuffled by id hash so "All Games" mixes the categories; stable.
export const gameCatalog: CatalogGame[] = (() => {
  const seen = new Set<string>();
  return [...existing(), ...generated()]
    .filter((game) => !seen.has(game.id) && !!seen.add(game.id))
    .sort((a, b) => hash(a.id) - hash(b.id));
})();
