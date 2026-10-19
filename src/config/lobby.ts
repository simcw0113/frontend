export type GameTag =
  | "slots"
  | "house"
  | "halloween"
  | "fishing"
  | "live"
  | "bonus"
  | "wagering"
  | "new";

export type GameSymbol =
  | "crown"
  | "ape"
  | "cat"
  | "helm"
  | "seven"
  | "pig"
  | "lantern"
  | "tiger"
  | "jet"
  | "orbit"
  | "star"
  | "pilot"
  | "ball"
  | "block"
  | "cards"
  | "coin"
  | "fish"
  | "ghost"
  | "table"
  | "reel";

export type Game = {
  id: string;
  title: string;
  provider: string;
  playing: number;
  tags: GameTag[];
  from: string;
  to: string;
  symbol: GameSymbol;
};

export type CategoryId = "lobby" | GameTag;

export const categories: { id: CategoryId; label: string }[] = [
  { id: "lobby", label: "Lobby" },
  { id: "slots", label: "Slots" },
  { id: "house", label: "House games" },
  { id: "halloween", label: "Halloween" },
  { id: "fishing", label: "Fishing games" },
  { id: "live", label: "Live casino" },
  { id: "bonus", label: "Bonus buy" },
  { id: "wagering", label: "Bonus wagering" },
  { id: "new", label: "New" },
];

export const slotGames: Game[] = [
  { id: "emerald-crown", title: "Emerald Crown", provider: "Nova", playing: 48, tags: ["slots", "new"], from: "#1f8a4c", to: "#0d3b28", symbol: "crown" },
  { id: "ape-legacy", title: "Ape Legacy", provider: "Nova", playing: 43, tags: ["slots"], from: "#f08a2a", to: "#8a3d12", symbol: "ape" },
  { id: "royal-whisker", title: "Royal Whisker", provider: "Orbit", playing: 36, tags: ["slots", "bonus"], from: "#49b7e8", to: "#1d4e86", symbol: "cat" },
  { id: "roman-gate", title: "Roman Gate", provider: "Summit", playing: 16, tags: ["slots"], from: "#e07a2f", to: "#7a3412", symbol: "helm" },
  { id: "seven-fire", title: "Seven Fire", provider: "Nova", playing: 22, tags: ["slots", "bonus"], from: "#e23b3b", to: "#7a1020", symbol: "seven" },
  { id: "gold-pig", title: "Gold Pig", provider: "Jolt", playing: 9, tags: ["slots", "wagering"], from: "#f0b429", to: "#a15c12", symbol: "pig" },
  { id: "temple-luck", title: "Temple Luck", provider: "Jolt", playing: 35, tags: ["slots"], from: "#d64545", to: "#6e1824", symbol: "lantern" },
  { id: "tiger-dance", title: "Tiger Dance", provider: "Nova", playing: 14, tags: ["slots", "new"], from: "#3d7dff", to: "#1a2f78", symbol: "tiger" },
];

export const houseGames: Game[] = [
  { id: "sky-jet", title: "Sky Jet", provider: "House", playing: 484, tags: ["house", "new"], from: "#5b3df5", to: "#24145f", symbol: "jet" },
  { id: "orbit-crash", title: "Orbit Crash", provider: "House", playing: 20, tags: ["house"], from: "#2f6bff", to: "#10245c", symbol: "orbit" },
  { id: "star-mine", title: "Star Mine", provider: "House", playing: 92, tags: ["house", "bonus"], from: "#ff5fa2", to: "#8a2458", symbol: "star" },
  { id: "nova-pilot", title: "Nova Pilot", provider: "House", playing: 98, tags: ["house"], from: "#c84bff", to: "#5a187e", symbol: "pilot" },
  { id: "penalty-kick", title: "Penalty Kick", provider: "House", playing: 28, tags: ["house"], from: "#3dcb6a", to: "#0e6b32", symbol: "ball" },
  { id: "limbo-drop", title: "Limbo Drop", provider: "House", playing: 84, tags: ["house", "wagering"], from: "#ff8a1e", to: "#b45309", symbol: "block" },
  { id: "card-jack", title: "Card Jack", provider: "House", playing: 24, tags: ["house"], from: "#24324a", to: "#121826", symbol: "cards" },
  { id: "coin-merge", title: "Coin Merge", provider: "House", playing: 37, tags: ["house", "new"], from: "#f5c542", to: "#8a6410", symbol: "coin" },
];

export const halloweenGames: Game[] = [
  { id: "ghost-reel", title: "Ghost Reel", provider: "Peak", playing: 61, tags: ["halloween", "slots"], from: "#6d28d9", to: "#2e1065", symbol: "ghost" },
  { id: "pumpkin-night", title: "Pumpkin Night", provider: "Peak", playing: 44, tags: ["halloween", "bonus"], from: "#f97316", to: "#7c2d12", symbol: "lantern" },
  { id: "mask-manor", title: "Mask Manor", provider: "Orbit", playing: 19, tags: ["halloween"], from: "#111827", to: "#3f1d4e", symbol: "helm" },
];

export const fishingGames: Game[] = [
  { id: "reef-blast", title: "Reef Blast", provider: "Orbit", playing: 73, tags: ["fishing"], from: "#0ea5e9", to: "#0c4a6e", symbol: "fish" },
  { id: "golden-catch", title: "Golden Catch", provider: "Jolt", playing: 51, tags: ["fishing", "wagering"], from: "#fbbf24", to: "#0e7490", symbol: "fish" },
  { id: "deep-reel", title: "Deep Reel", provider: "Nova", playing: 33, tags: ["fishing", "new"], from: "#0369a1", to: "#082f49", symbol: "reel" },
];

export const liveGames: Game[] = [
  { id: "live-roulette", title: "Live Roulette", provider: "Summit", playing: 126, tags: ["live"], from: "#7f1d1d", to: "#1c1917", symbol: "table" },
  { id: "live-blackjack", title: "Live Blackjack", provider: "Summit", playing: 88, tags: ["live", "new"], from: "#14532d", to: "#052e16", symbol: "cards" },
  { id: "live-baccarat", title: "Live Baccarat", provider: "House", playing: 64, tags: ["live"], from: "#1e3a8a", to: "#172554", symbol: "table" },
];

export const lobbyRows: { id: string; title: string; games: Game[] }[] = [
  { id: "slots", title: "Slots", games: slotGames },
  { id: "house", title: "House games", games: houseGames },
];

export const gamesByCategory: Record<Exclude<CategoryId, "lobby">, Game[]> = {
  slots: slotGames,
  house: houseGames,
  halloween: halloweenGames,
  fishing: fishingGames,
  live: liveGames,
  bonus: [...slotGames, ...houseGames, ...halloweenGames].filter((game) => game.tags.includes("bonus")),
  wagering: [...slotGames, ...houseGames, ...fishingGames].filter((game) => game.tags.includes("wagering")),
  new: [...slotGames, ...houseGames, ...fishingGames, ...liveGames].filter((game) => game.tags.includes("new")),
};

export const providers = ["Nova", "Orbit", "Summit", "Jolt", "House", "Peak"];

export const trendingGames: Game[] = [
  ...slotGames,
  houseGames[0],
  houseGames[2],
  houseGames[4],
  houseGames[6],
];

// Games of the "Slots" category (/casino/slots). Static placeholder data, to be
// replaced by an API response of the same shape.
export const slotsGames: Game[] = [
  { id: "fortune-reels", title: "Fortune Reels", provider: "Pragmatic Play", playing: 212, tags: ["slots", "bonus"], from: "#f59e0b", to: "#7c2d12", symbol: "seven" },
  { id: "dragon-lantern", title: "Dragon Lantern", provider: "Jili", playing: 187, tags: ["slots", "new"], from: "#dc2626", to: "#5f1020", symbol: "lantern" },
  { id: "wild-tiger-gold", title: "Wild Tiger Gold", provider: "PG Soft", playing: 164, tags: ["slots"], from: "#f97316", to: "#7c2d12", symbol: "tiger" },
  { id: "crown-of-pharaohs", title: "Crown of Pharaohs", provider: "Hacksaw", playing: 143, tags: ["slots", "bonus"], from: "#ca8a04", to: "#422006", symbol: "crown" },
  { id: "jungle-king", title: "Jungle King", provider: "Nolimit City", playing: 129, tags: ["slots", "wagering"], from: "#16a34a", to: "#14532d", symbol: "ape" },
  { id: "lucky-piggy", title: "Lucky Piggy", provider: "Habanero", playing: 98, tags: ["slots"], from: "#eab308", to: "#854d0e", symbol: "pig" },
  { id: "midnight-manor", title: "Midnight Manor", provider: "Relax", playing: 86, tags: ["slots", "new"], from: "#7c3aed", to: "#2e1065", symbol: "ghost" },
  { id: "golden-whiskers", title: "Golden Whiskers", provider: "Playtech", playing: 77, tags: ["slots"], from: "#38bdf8", to: "#1e3a8a", symbol: "cat" },
  { id: "megaways-legion", title: "Megaways Legion", provider: "Big Time Gaming", playing: 121, tags: ["slots", "bonus"], from: "#ef4444", to: "#7f1d1d", symbol: "helm" },
  { id: "starlight-spins", title: "Starlight Spins", provider: "Push Gaming", playing: 64, tags: ["slots"], from: "#6366f1", to: "#1e1b4b", symbol: "star" },
  { id: "coin-cascade", title: "Coin Cascade", provider: "Red Tiger", playing: 59, tags: ["slots", "wagering"], from: "#facc15", to: "#a16207", symbol: "coin" },
  { id: "deep-sea-treasure", title: "Deep Sea Treasure", provider: "Pragmatic Play", playing: 55, tags: ["slots"], from: "#0ea5e9", to: "#0c4a6e", symbol: "fish" },
  { id: "hot-reels-777", title: "Hot Reels 777", provider: "Jili", playing: 48, tags: ["slots"], from: "#e11d48", to: "#4c0519", symbol: "reel" },
  { id: "emperors-fortune", title: "Emperor's Fortune", provider: "PG Soft", playing: 44, tags: ["slots", "new"], from: "#d97706", to: "#78350f", symbol: "crown" },
  { id: "bonanza-ape", title: "Bonanza Ape", provider: "Hacksaw", playing: 39, tags: ["slots"], from: "#f97316", to: "#9a3412", symbol: "ape" },
  { id: "neon-sevens", title: "Neon Sevens", provider: "Evolution", playing: 33, tags: ["slots"], from: "#a855f7", to: "#3b0764", symbol: "seven" },
];

// Games of each casino category, keyed by slug (see config/categories.ts).
export const categoryGames: Record<string, Game[]> = {
  "trending-games": trendingGames,
  slots: slotsGames,
};

export const sideNav: { id: string; label: string; items?: string[] }[] = [
  { id: "promotions", label: "Promotions", items: ["Welcome offer", "Races", "Drops"] },
  { id: "challenges", label: "Challenges" },
  { id: "affiliate", label: "Affiliate" },
  { id: "vip", label: "VIP Club" },
  { id: "blog", label: "Blog" },
  { id: "forum", label: "Forum" },
  { id: "sponsorships", label: "Sponsorships", items: ["Teams", "Events"] },
  { id: "responsible", label: "Responsible gambling" },
  { id: "support", label: "Live support" },
];
