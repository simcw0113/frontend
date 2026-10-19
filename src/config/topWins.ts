// "Top wins of the month" on the lobby home page. FAKE sample data, static for
// now: the API replaces it (see lib/topWins.ts). `gameId` is the id of a game in
// config/lobby.ts (staticGameId); `playerId` is a made-up id that lib/topWins.ts masks before
// it reaches the page. The currency comes with the data.
import { staticGameId } from "@/config/lobby";

export type TopWinEntry = {
  rank: number;
  gameId: string;
  playerId: string;
  amount: number;
  currency: string;
};

export const topWinEntries: TopWinEntry[] = [
  { rank: 1, gameId: staticGameId("dragon-lantern"), playerId: "20481937", amount: 54884, currency: "USDT" },
  { rank: 2, gameId: staticGameId("fortune-reels"), playerId: "50127337", amount: 36000, currency: "USDT" },
  { rank: 3, gameId: staticGameId("crown-of-pharaohs"), playerId: "90365545", amount: 32475, currency: "USDT" },
  { rank: 4, gameId: staticGameId("wild-tiger-gold"), playerId: "56208113", amount: 27600, currency: "USDT" },
  { rank: 5, gameId: staticGameId("megaways-legion"), playerId: "74913329", amount: 20000, currency: "USDT" },
  { rank: 6, gameId: staticGameId("midnight-manor"), playerId: "92647187", amount: 20000, currency: "USDT" },
  { rank: 7, gameId: staticGameId("jungle-king"), playerId: "31580462", amount: 18250, currency: "USDT" },
  { rank: 8, gameId: staticGameId("sky-jet"), playerId: "67204915", amount: 16900, currency: "USDT" },
];
