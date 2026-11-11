// Sample VIP club for /{lang}/vip. Numbers only — names and labels live in i18n.
// Temporary until the backend has a VIP endpoint. Not the signed-in player's level.

export const VIP_TIERS_IN_GROUP = 5;

export const vipGroups = [
  { id: "silver", color: "#d7dee8", rakeback: 5, reward: 25, wager: 25_000 },
  { id: "gold", color: "#f5c451", rakeback: 8, reward: 80, wager: 100_000 },
  { id: "emerald", color: "#3ddc97", rakeback: 10, reward: 200, wager: 500_000 },
  { id: "sapphire", color: "#4cc3ff", rakeback: 12, reward: 500, wager: 1_500_000 },
  { id: "ruby", color: "#ff5a7a", rakeback: 15, reward: 1_200, wager: 5_000_000 },
  { id: "diamond", color: "#d7c4ff", rakeback: 20, reward: 3_000, wager: 15_000_000 },
] as const;

export type VipGroupId = (typeof vipGroups)[number]["id"];

// The preview player is Silver 2, part-way to Silver 3.
export const vipSample = {
  groupId: "silver" as VipGroupId,
  tier: 2,
  wagered: 12_400,
  claimedTotal: 86,
  claimed: [
    { id: "reload", amount: 40 },
    { id: "instant", amount: 46 },
  ],
  rewards: [
    { id: "reload", amount: 15, state: "ready" },
    { id: "instant", amount: 2.4, state: "ready" },
    { id: "daily", amount: 0, state: "locked" },
    { id: "weekly", amount: 40, state: "ready" },
    { id: "monthly", amount: 0, state: "locked" },
  ],
} as const;

export type VipRewardId = (typeof vipSample.rewards)[number]["id"];
export type VipRewardState = (typeof vipSample.rewards)[number]["state"];
