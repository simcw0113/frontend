// "Top wins of the month" on the lobby home page. FAKE sample data, static for
// now: the API replaces it (see lib/topWins.ts). `gameId` points at a game in
// config/lobby.ts; `playerId` is a made-up id that lib/topWins.ts masks before
// it reaches the page. The currency comes with the data.
export type TopWinEntry = {
  rank: number;
  gameId: string;
  playerId: string;
  amount: number;
  currency: string;
};

export const topWinEntries: TopWinEntry[] = [
  { rank: 1, gameId: "dragon-lantern", playerId: "20481937", amount: 54884, currency: "USDT" },
  { rank: 2, gameId: "fortune-reels", playerId: "50127337", amount: 36000, currency: "USDT" },
  { rank: 3, gameId: "crown-of-pharaohs", playerId: "90365545", amount: 32475, currency: "USDT" },
  { rank: 4, gameId: "wild-tiger-gold", playerId: "56208113", amount: 27600, currency: "USDT" },
  { rank: 5, gameId: "megaways-legion", playerId: "74913329", amount: 20000, currency: "USDT" },
  { rank: 6, gameId: "midnight-manor", playerId: "92647187", amount: 20000, currency: "USDT" },
  { rank: 7, gameId: "jungle-king", playerId: "31580462", amount: 18250, currency: "USDT" },
  { rank: 8, gameId: "sky-jet", playerId: "67204915", amount: 16900, currency: "USDT" },
];
