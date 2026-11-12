
// Promotions page (/{lang}/promotions). STATIC sample data with neutral, invented wording;
// the API replaces it later (see src/lib/promotions.ts). It mirrors what the API is
// expected to send: the text already localized per language, English as the fallback.
//
// `image` is a future banner URL: when set, the card shows the image instead of the
// built-in placeholder banner (headline + tagline + `icon` art). Dates are ISO (UTC).
export type PromotionIcon =
  | "coins"
  | "crown"
  | "multiplier"
  | "shield"
  | "referral"
  | "rebate"
  | "calendar"
  | "wallet"
  | "gem";

export type PromotionText = {
  title: string;
  headline: [string, string]; // two short banner lines, about 10 characters each
  tagline: string;
  summary: string;
  terms: string[]; // a few short bullet points
};

export type StaticPromotion = {
  id: string;
  slug: string;
  icon: PromotionIcon;
  sort: number;
  startDate: string;
  endDate: string;
  image?: string;
  // Keyed by UI locale (en, zh, bm, vi, th, ...); English is the fallback. Extra keys (de, es) are unused.
  text: { en: PromotionText } & Partial<Record<string, PromotionText>>;
};

// TEST image used by every sample promo (requested for testing). Replace per promo by setting
// its own `image`, or remove `image` to show the built-in placeholder banner again.
export const TEST_PROMO_IMAGE = "/promotions/test-promo.jpg"; // public/promotions/test-promo.jpg

export const staticPromotions: StaticPromotion[] = [
  {
    id: "crypto-elites",
    slug: "crypto-elites",
    icon: "coins",
    sort: 1,
    startDate: "2026-10-01",
    endDate: "2026-12-31",
    image: TEST_PROMO_IMAGE,
    text: {
      en: {
        title: "Crypto Elites",
        headline: ["CRYPTO", "ELITES"],
        tagline: "Unlock up to 500 USDT",
        summary: "Deposit in crypto and unlock rewards of up to 500 USDT.",
        terms: ["Crypto deposits only", "Min. deposit 20 USDT", "Credited within 24 hours"],
      },
      zh: {
        title: "加密精英",
        headline: ["加密", "精英"],
        tagline: "最高解锁 500 USDT",
        summary: "使用加密货币存款，解锁最高 500 USDT 奖励。",
        terms: ["仅限加密货币存款", "最低存款 20 USDT", "24 小时内到账"],
      },
      de: {
        title: "Krypto-Elite",
        headline: ["KRYPTO", "ELITE"],
        tagline: "Bis zu 500 USDT freischalten",
        summary: "Zahle mit Krypto ein und schalte bis zu 500 USDT frei.",
        terms: ["Nur Krypto-Einzahlungen", "Mindesteinzahlung 20 USDT", "Gutschrift in 24 Stunden"],
      },
      es: {
        title: "Cripto Élite",
        headline: ["CRIPTO", "ÉLITE"],
        tagline: "Desbloquea hasta 500 USDT",
        summary: "Deposita en cripto y desbloquea hasta 500 USDT en premios.",
        terms: ["Solo depósitos en cripto", "Depósito mínimo 20 USDT", "Abono en 24 horas"],
      },
    },
  },
  {
    id: "vip-transfer",
    slug: "vip-transfer",
    icon: "crown",
    sort: 2,
    startDate: "2026-10-01",
    endDate: "2026-12-31",
    image: TEST_PROMO_IMAGE,
    text: {
      en: {
        title: "VIP Transfer",
        headline: ["VIP", "TRANSFER"],
        tagline: "Match your VIP status",
        summary: "Bring your VIP level from another site and keep your perks.",
        terms: ["Proof of VIP level required", "Review in 3 working days", "One transfer per account"],
      },
      zh: {
        title: "VIP 转移",
        headline: ["VIP", "转移"],
        tagline: "匹配你的 VIP 等级",
        summary: "带着你在其他平台的 VIP 等级过来，福利照旧。",
        terms: ["需提供 VIP 等级证明", "3 个工作日内审核", "每个账户限一次"],
      },
      de: {
        title: "VIP-Transfer",
        headline: ["VIP", "TRANSFER"],
        tagline: "Behalte deinen VIP-Status",
        summary: "Bring deinen VIP-Status von einer anderen Seite mit.",
        terms: ["Nachweis des VIP-Status nötig", "Prüfung in 3 Werktagen", "Einmal pro Konto"],
      },
      es: {
        title: "Traspaso VIP",
        headline: ["VIP", "TRASPASO"],
        tagline: "Igualamos tu nivel VIP",
        summary: "Trae tu nivel VIP de otro sitio y conserva tus ventajas.",
        terms: ["Prueba de nivel VIP", "Revisión en 3 días hábiles", "Un traspaso por cuenta"],
      },
    },
  },
  {
    id: "slots-multiplier",
    slug: "slots-multiplier-challenge",
    icon: "multiplier",
    sort: 3,
    startDate: "2026-10-05",
    endDate: "2026-11-30",
    image: TEST_PROMO_IMAGE,
    text: {
      en: {
        title: "Slots Multiplier Challenge",
        headline: ["SLOTS", "MULTIPLIER"],
        tagline: "Hit the top multiplier, win prizes",
        summary: "Land the highest multiplier on selected slots each week.",
        terms: ["Selected slots only", "Min. bet 0.50 USDT", "Leaderboard resets weekly"],
      },
      zh: {
        title: "老虎机倍数挑战",
        headline: ["老虎机", "倍数挑战"],
        tagline: "冲击最高倍数，赢取奖品",
        summary: "每周在指定老虎机中打出最高倍数即可获奖。",
        terms: ["仅限指定老虎机", "最低投注 0.50 USDT", "排行榜每周重置"],
      },
      de: {
        title: "Slot-Challenge",
        headline: ["SLOT-", "CHALLENGE"],
        tagline: "Höchster Multiplikator gewinnt",
        summary: "Erziele jede Woche den höchsten Multiplikator auf ausgewählten Slots.",
        terms: ["Nur ausgewählte Slots", "Mindesteinsatz 0,50 USDT", "Rangliste wöchentlich neu"],
      },
      es: {
        title: "Reto de slots",
        headline: ["RETO DE", "SLOTS"],
        tagline: "Logra el mayor multiplicador",
        summary: "Consigue el multiplicador más alto en slots seleccionados cada semana.",
        terms: ["Solo slots seleccionados", "Apuesta mínima 0,50 USDT", "Clasificación semanal"],
      },
    },
  },
  {
    id: "risk-free-bet",
    slug: "risk-free-bet",
    icon: "shield",
    sort: 4,
    startDate: "2026-10-01",
    endDate: "2026-12-31",
    image: TEST_PROMO_IMAGE,
    text: {
      en: {
        title: "Risk-Free Bet",
        headline: ["RISK-FREE", "BET"],
        tagline: "100% cashback on your first lost bet",
        summary: "Lost your first bet? Get it back as cashback.",
        terms: ["First bet only", "Cashback up to 100 USDT", "Sports and esports"],
      },
      zh: {
        title: "无风险投注",
        headline: ["无风险", "投注"],
        tagline: "首注输了 100% 返现",
        summary: "首注失利？全额返现给你。",
        terms: ["仅限首注", "最高返现 100 USDT", "体育和电竞"],
      },
      de: {
        title: "Risikofreie Wette",
        headline: ["RISIKOFREI", "WETTE"],
        tagline: "100 % Cashback auf die erste verlorene Wette",
        summary: "Erste Wette verloren? Du bekommst sie als Cashback zurück.",
        terms: ["Nur die erste Wette", "Cashback bis 100 USDT", "Sport und E-Sport"],
      },
      es: {
        title: "Apuesta sin riesgo",
        headline: ["APUESTA", "SIN RIESGO"],
        tagline: "100 % de reembolso en tu primera apuesta perdida",
        summary: "¿Perdiste tu primera apuesta? Te la devolvemos como reembolso.",
        terms: ["Solo la primera apuesta", "Reembolso hasta 100 USDT", "Deportes y esports"],
      },
    },
  },
  {
    id: "refer-earn",
    slug: "refer-and-earn",
    icon: "referral",
    sort: 5,
    startDate: "2026-10-01",
    endDate: "2027-03-31",
    image: TEST_PROMO_IMAGE,
    text: {
      en: {
        title: "Refer & Earn",
        headline: ["REFER", "& EARN"],
        tagline: "50 USDT per friend + 10% of wagers",
        summary: "Invite friends and earn 50 USDT each, plus 10% of their wagers.",
        terms: ["Friend must verify and deposit", "Paid weekly", "No referral limit"],
      },
      zh: {
        title: "推荐赚钱",
        headline: ["推荐", "赚钱"],
        tagline: "每位好友 50 USDT + 10% 投注佣金",
        summary: "邀请好友，每位赚 50 USDT，另享其投注额 10% 佣金。",
        terms: ["好友需完成验证并存款", "每周发放", "推荐人数不限"],
      },
      de: {
        title: "Freunde werben",
        headline: ["FREUNDE", "WERBEN"],
        tagline: "50 USDT pro Freund + 10 % der Einsätze",
        summary: "Lade Freunde ein: 50 USDT pro Freund plus 10 % ihrer Einsätze.",
        terms: ["Freund muss sich verifizieren und einzahlen", "Wöchentliche Auszahlung", "Ohne Limit"],
      },
      es: {
        title: "Invita y gana",
        headline: ["INVITA", "Y GANA"],
        tagline: "50 USDT por amigo + 10 % de sus apuestas",
        summary: "Invita a tus amigos: 50 USDT por cada uno y el 10 % de sus apuestas.",
        terms: ["Tu amigo debe verificarse y depositar", "Pago semanal", "Sin límite de invitaciones"],
      },
    },
  },
  {
    id: "instant-rebate",
    slug: "unlimited-instant-rebate",
    icon: "rebate",
    sort: 6,
    startDate: "2026-10-01",
    endDate: "2026-12-31",
    image: TEST_PROMO_IMAGE,
    text: {
      en: {
        title: "Unlimited Instant Rebate",
        headline: ["INSTANT", "REBATE"],
        tagline: "A rebate on every bet, no cap",
        summary: "Get a rebate on every settled bet, with no upper limit.",
        terms: ["Credited after each settled bet", "No wagering requirement", "All games"],
      },
      zh: {
        title: "无限即时返水",
        headline: ["即时", "返水"],
        tagline: "每注返水，上不封顶",
        summary: "每笔结算投注都有返水，没有上限。",
        terms: ["每笔投注结算后到账", "无流水要求", "适用所有游戏"],
      },
      de: {
        title: "Unbegrenzter Sofortrabatt",
        headline: ["SOFORT-", "RABATT"],
        tagline: "Rabatt auf jede Wette, ohne Limit",
        summary: "Erhalte auf jede abgerechnete Wette einen Rabatt, ohne Obergrenze.",
        terms: ["Gutschrift nach jeder Wette", "Keine Umsatzbedingung", "Alle Spiele"],
      },
      es: {
        title: "Reembolso instantáneo",
        headline: ["REEMBOLSO", "YA"],
        tagline: "Reembolso en cada apuesta, sin tope",
        summary: "Recibe un reembolso en cada apuesta liquidada, sin límite.",
        terms: ["Abono tras cada apuesta", "Sin requisito de apuesta", "Todos los juegos"],
      },
    },
  },
  {
    id: "weekly-cashback",
    slug: "weekly-cashback",
    icon: "calendar",
    sort: 7,
    startDate: "2026-10-01",
    endDate: "2026-12-31",
    image: TEST_PROMO_IMAGE,
    text: {
      en: {
        title: "Weekly Cashback",
        headline: ["WEEKLY", "CASHBACK"],
        tagline: "Up to 10% back every Monday",
        summary: "Get up to 10% of your weekly net losses back every Monday.",
        terms: ["Based on net losses", "Credited every Monday", "Min. cashback 5 USDT"],
      },
      zh: {
        title: "每周返现",
        headline: ["每周", "返现"],
        tagline: "每周一最高返 10%",
        summary: "每周一返还上周净亏损的最高 10%。",
        terms: ["按净亏损计算", "每周一到账", "最低返现 5 USDT"],
      },
      de: {
        title: "Wöchentliches Cashback",
        headline: ["WOCHEN-", "CASHBACK"],
        tagline: "Bis zu 10 % jeden Montag zurück",
        summary: "Jeden Montag bis zu 10 % deiner Nettoverluste der Woche zurück.",
        terms: ["Auf Nettoverluste", "Gutschrift jeden Montag", "Mindestens 5 USDT"],
      },
      es: {
        title: "Reembolso semanal",
        headline: ["CASHBACK", "SEMANAL"],
        tagline: "Hasta un 10 % cada lunes",
        summary: "Recupera cada lunes hasta el 10 % de tus pérdidas netas semanales.",
        terms: ["Sobre pérdidas netas", "Abono cada lunes", "Mínimo 5 USDT"],
      },
    },
  },
  {
    id: "monthly-cashback",
    slug: "monthly-cashback",
    icon: "wallet",
    sort: 8,
    startDate: "2026-10-01",
    endDate: "2026-12-31",
    image: TEST_PROMO_IMAGE,
    text: {
      en: {
        title: "Monthly Cashback",
        headline: ["MONTHLY", "CASHBACK"],
        tagline: "Up to 15% back each month",
        summary: "Get up to 15% of your monthly net losses back on the 1st.",
        terms: ["Based on net losses", "Credited on the 1st", "Min. cashback 10 USDT"],
      },
      zh: {
        title: "每月返现",
        headline: ["每月", "返现"],
        tagline: "每月最高返 15%",
        summary: "每月 1 日返还上月净亏损的最高 15%。",
        terms: ["按净亏损计算", "每月 1 日到账", "最低返现 10 USDT"],
      },
      de: {
        title: "Monatliches Cashback",
        headline: ["MONATS-", "CASHBACK"],
        tagline: "Bis zu 15 % jeden Monat zurück",
        summary: "Am 1. jedes Monats bis zu 15 % deiner Nettoverluste zurück.",
        terms: ["Auf Nettoverluste", "Gutschrift am 1. des Monats", "Mindestens 10 USDT"],
      },
      es: {
        title: "Reembolso mensual",
        headline: ["CASHBACK", "MENSUAL"],
        tagline: "Hasta un 15 % cada mes",
        summary: "Recupera el día 1 hasta el 15 % de tus pérdidas netas del mes.",
        terms: ["Sobre pérdidas netas", "Abono el día 1", "Mínimo 10 USDT"],
      },
    },
  },
  {
    id: "vip-rewards",
    slug: "vip-rewards",
    icon: "gem",
    sort: 9,
    startDate: "2026-10-01",
    endDate: "2027-09-30",
    image: TEST_PROMO_IMAGE,
    text: {
      en: {
        title: "VIP Rewards",
        headline: ["VIP", "REWARDS"],
        tagline: "Exclusive perks for VIP members",
        summary: "Climb the VIP levels for bigger rewards and personal service.",
        terms: ["By invitation", "Personal account manager", "Faster withdrawals"],
      },
      zh: {
        title: "VIP 奖励",
        headline: ["VIP", "奖励"],
        tagline: "VIP 会员专属福利",
        summary: "VIP 等级越高，奖励越多，还有专属服务。",
        terms: ["受邀加入", "专属客户经理", "更快提款"],
      },
      de: {
        title: "VIP-Prämien",
        headline: ["VIP", "PRÄMIEN"],
        tagline: "Exklusive Vorteile für VIPs",
        summary: "Steig im VIP-Level auf: größere Prämien und persönlicher Service.",
        terms: ["Nur auf Einladung", "Persönlicher Ansprechpartner", "Schnellere Auszahlungen"],
      },
      es: {
        title: "Premios VIP",
        headline: ["PREMIOS", "VIP"],
        tagline: "Ventajas exclusivas para VIP",
        summary: "Sube de nivel VIP para lograr más premios y atención personal.",
        terms: ["Solo por invitación", "Gestor de cuenta personal", "Retiros más rápidos"],
      },
    },
  },
];
