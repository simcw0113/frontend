// Game providers shown in the "Providers" row of the View all games page.
// Static placeholder data: swap `providers` for an API response of the same
// shape later. `mark` is a 1-2 letter monogram and `accent` its colour; they
// stand in for provider logos (`logo?: string` can be added once the API has
// image URLs). Game data does not carry these provider ids yet, so selection is
// visual only; to filter, compare `game.provider` with the selected id.
export type Provider = {
  id: string;
  name: string;
  mark: string;
  accent: string;
};

export const providers: Provider[] = [
  { id: "pragmatic-play", name: "Pragmatic Play", mark: "PP", accent: "#ffb020" },
  { id: "hacksaw", name: "Hacksaw", mark: "H", accent: "#7dff6a" },
  { id: "relax", name: "Relax", mark: "R", accent: "#e6edf0" },
  { id: "nolimit-city", name: "Nolimit City", mark: "NL", accent: "#ffffff" },
  { id: "jili", name: "Jili", mark: "J", accent: "#ffcf3f" },
  { id: "habanero", name: "Habanero", mark: "Hb", accent: "#ff8a3d" },
  { id: "big-time-gaming", name: "Big Time Gaming", mark: "BT", accent: "#ff5c5c" },
  { id: "playtech", name: "Playtech", mark: "Pt", accent: "#4cc3ff" },
  { id: "evolution", name: "Evolution", mark: "Ev", accent: "#c9a3ff" },
  { id: "pg-soft", name: "PG Soft", mark: "PG", accent: "#ff7ad9" },
  { id: "red-tiger", name: "Red Tiger", mark: "RT", accent: "#ff6b6b" },
  { id: "push-gaming", name: "Push Gaming", mark: "Pu", accent: "#5ef0c4" },
];
