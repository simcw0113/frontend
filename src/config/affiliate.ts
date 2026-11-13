// Sample affiliate programme figures for /{lang}/affiliate.
// TODO(API): replace these placeholder rates when the affiliate backend exists.
// Nothing here is a live commission schedule.

export const affiliateConfig = {
  // Default rate shown in the how-it-works section (percent).
  commissionRate: 10,
  // Tiers by number of active referred players in a period. Placeholder only.
  tiers: [
    { id: "start", minActive: 0, rate: 10 },
    { id: "plus", minActive: 10, rate: 15 },
    { id: "pro", minActive: 30, rate: 20 },
  ],
} as const;

export type AffiliateTierId = (typeof affiliateConfig.tiers)[number]["id"];
