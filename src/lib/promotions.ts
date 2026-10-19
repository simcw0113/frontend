import { cacheLife, cacheTag } from "next/cache";
import { staticPromotions, type PromotionIcon } from "@/config/promotions";
import { apiConfig } from "@/config/site";
import { apiJson } from "@/lib/api";
import { useStaticData as isStaticData } from "@/lib/apiMode";
import { fromSlug, isSlug } from "@/i18n/routing";

// Promotions for /{lang}/promotions. Server only. Same pattern as lib/topWins.ts: static
// sample data (config/promotions.ts) while there is no API address (apiConfig.useStaticPromotions,
// see lib/apiMode.ts), otherwise a cached public API call (tag "promotions") that never throws
// and never sends an auth token (see the notes in lib/games.ts). The API is expected to return
// the text already in the requested language.

export type Promotion = {
  id: string;
  slug: string;
  title: string;
  headline: string[]; // banner lines
  tagline: string;
  summary: string;
  terms: string[];
  startDate: string; // ISO date
  endDate: string;
  image?: string; // banner URL; without it the card draws a placeholder banner
  icon: PromotionIcon;
  sort: number;
};

export type PromotionsResult = { promotions: Promotion[]; error?: boolean };

// TODO(API): shape of one promotion in the API response. Adjust to the real fields.
export type PromotionDto = {
  id: string | number;
  slug?: string;
  title: string;
  headline?: string | string[];
  tagline?: string;
  summary?: string;
  terms?: string[];
  start_date?: string;
  end_date?: string;
  image?: string;
  icon?: string;
  sort?: number;
};

const ICONS: PromotionIcon[] = ["coins", "crown", "multiplier", "shield", "referral", "rebate", "calendar", "wallet", "gem"];

// TODO(API): map the real response onto Promotion (and unwrap its envelope).
export function mapPromotions(payload: { data?: PromotionDto[] } | PromotionDto[]): Promotion[] {
  const items = Array.isArray(payload) ? payload : payload.data;
  if (!Array.isArray(items)) throw new Error("Unexpected promotions response");
  return items.map((item, index) => {
    const headline = Array.isArray(item.headline) ? item.headline : (item.headline ?? item.title).split("\n");
    return {
      id: String(item.id),
      slug: item.slug ?? String(item.id),
      title: item.title,
      headline: headline.slice(0, 2),
      tagline: item.tagline ?? "",
      summary: item.summary ?? "",
      terms: item.terms ?? [],
      startDate: item.start_date ?? "",
      endDate: item.end_date ?? "",
      image: item.image || undefined,
      icon: ICONS.find((icon) => icon === item.icon) ?? "gem",
      sort: item.sort ?? index + 1,
    };
  });
}

const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_PROMOTIONS_PATH = "/promotions";

function fromStatic(lang: string): PromotionsResult {
  const locale = isSlug(lang) ? fromSlug(lang) : "en";
  const promotions = staticPromotions.map(({ text, ...promo }) => ({ ...promo, ...(text[locale] ?? text.en) }));
  return { promotions: promotions.sort((a, b) => a.sort - b.sort) };
}

async function fromApi(lang: string): Promise<PromotionsResult> {
  "use cache";
  cacheTag("promotions");

  try {
    // TODO(API): endpoint path lives in apiConfig.promotionsPath (config/site.ts).
    const payload = await apiJson<{ data?: PromotionDto[] } | PromotionDto[]>(
      `${apiConfig.promotionsPath || DEFAULT_PROMOTIONS_PATH}?${new URLSearchParams({ lang })}`,
      { auth: false, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );
    const promotions = mapPromotions(payload).sort((a, b) => a.sort - b.sort);
    cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
    return { promotions };
  } catch {
    cacheLife({ stale: 0, revalidate: 0, expire: 0 }); // never cache a failure
    return { promotions: [], error: true };
  }
}

// Never throws: the page shows its error state on `error` and "No promotions right now" on [].
export async function getPromotions({ lang }: { lang: string }): Promise<PromotionsResult> {
  const config: Partial<typeof apiConfig> = apiConfig;
  return isStaticData(config.useStaticPromotions) ? fromStatic(lang) : fromApi(lang);
}
