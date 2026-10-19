// "Our Partners" on the lobby home page (src/components/lobby/Partners.tsx).
// Static placeholder partners with invented names: NO real brands or logos.
//
// Swap in a real logo: set `logo` to an image URL (the tile then renders the image with
// the partner name as its alt text). Without `logo` the tile draws a placeholder wordmark
// from `mark` (text, colour, style, optional monogram badge). Colours must keep at least
// 3:1 contrast on the white tile. When the API arrives, see src/lib/partners.ts.
export type PartnerMark = {
  text: string; // short wordmark, ideally one word
  color: string;
  style: "bold" | "italic" | "caps" | "light" | "mono";
  badge?: "circle" | "square"; // monogram badge before the text
};

export type Partner = {
  id: string;
  name: string;
  logo?: string; // future image URL
  mark?: PartnerMark;
};

export const staticPartners: Partner[] = [
  { id: "aurora-gaming", name: "Aurora Gaming", mark: { text: "Aurora", color: "#0e7490", style: "bold", badge: "circle" } },
  { id: "nova-live", name: "Nova Live", mark: { text: "NovaLive", color: "#be123c", style: "italic" } },
  { id: "summit-studio", name: "Summit Studio", mark: { text: "Summit", color: "#1d4ed8", style: "caps" } },
  { id: "kestrel-play", name: "Kestrel Play", mark: { text: "kestrel", color: "#b45309", style: "light", badge: "square" } },
  { id: "borealis-games", name: "Borealis Games", mark: { text: "Borealis", color: "#15803d", style: "bold" } },
  { id: "meridian-slots", name: "Meridian Slots", mark: { text: "Meridian", color: "#6d28d9", style: "mono", badge: "circle" } },
  { id: "quasar-live", name: "Quasar Live", mark: { text: "QUASAR", color: "#334155", style: "caps" } },
  { id: "ember-studios", name: "Ember Studios", mark: { text: "Ember", color: "#c2410c", style: "italic", badge: "square" } },
  { id: "lumen-games", name: "Lumen Games", mark: { text: "lumen", color: "#a16207", style: "light", badge: "circle" } },
  { id: "zephyr-gaming", name: "Zephyr Gaming", mark: { text: "Zephyr", color: "#0369a1", style: "bold", badge: "square" } },
];
