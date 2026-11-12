import { cacheLife, cacheTag } from "next/cache";
import { staticPromotions, type PromotionIcon } from "@/config/promotions";
import { apiConfig } from "@/config/site";
import { apiJson, isApiStatusFailure } from "@/lib/api";
import { useStaticData as isStaticData } from "@/lib/apiMode";
import { lobbyLocale } from "@/lib/lobbyApi";
import { uiLocale } from "@/i18n";

// Promotions for /{lang}/promotions. Server only. Static sample data
// (config/promotions.ts) while there is no API address (apiConfig.useStaticPromotions,
// see lib/apiMode.ts). Otherwise POST /promotion (tag "promotions"): public, cached,
// no auth token. The API returns the text already in the requested locale.

export type Promotion = {
  id: string;
  slug: string;
  title: string;
  headline: string[]; // banner lines
  tagline: string;
  summary: string;
  terms: string[];
  content?: string; // HTML body from POST /promotion (`content`)
  startDate: string; // ISO date (static samples only; POST /promotion has no dates)
  endDate: string;
  image?: string; // banner URL; without it the card draws a placeholder banner
  icon: PromotionIcon;
  sort: number;
};

export type PromotionsResult = { promotions: Promotion[]; error?: boolean };

// One page from POST /promotion. `data[0]` is the full list (category 0 = all).
export type PromotionDto = {
  id?: string | number;
  sequence?: number;
  category?: string | number;
  name?: string;
  summary?: string;
  image?: string;
  content?: string;
  url?: string;
  promotion_code?: string;
  // Older placeholder shape, still accepted.
  title?: string;
  slug?: string;
  headline?: string | string[];
  tagline?: string;
  terms?: string[];
  start_date?: string;
  end_date?: string;
  icon?: string;
  sort?: number;
};

const ICONS: PromotionIcon[] = ["coins", "crown", "multiplier", "shield", "referral", "rebate", "calendar", "wallet", "gem"];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Banner and content images are often site-root paths (`/storage/...`).
function mediaUrl(value: string): string {
  if (!value || /^https?:\/\//i.test(value)) return value;
  const origin = (apiConfig.baseUrl || "").replace(/\/api\/?$/, "");
  if (!origin) return value;
  return `${origin}${value.startsWith("/") ? value : `/${value}`}`;
}

function headlineFrom(name: string): [string, string] {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [name, ""];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

// POST /promotion groups pages by category. Numeric keys 0..n JSON-encode as an
// array; index 0 is every page. An object uses the "0" key the same way.
function readPromotionItems(payload: unknown): PromotionDto[] {
  const root = asRecord(payload);
  const data = root && "data" in root ? root.data : payload;
  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    if (data.every(Array.isArray)) return (data[0] as PromotionDto[]) ?? [];
    return data as PromotionDto[];
  }
  const record = asRecord(data);
  if (!record) throw new Error("Unexpected promotions response");
  const all = record["0"];
  if (Array.isArray(all)) return all as PromotionDto[];
  const first = Object.values(record).find(Array.isArray);
  if (!Array.isArray(first)) throw new Error("Unexpected promotions response");
  return first as PromotionDto[];
}

// Sequence 0 is unsorted on the API and sorts last, matching the category buckets.
function bySequence(a: Promotion, b: Promotion): number {
  const rank = (n: number) => (n === 0 ? Number.MAX_SAFE_INTEGER : n);
  return rank(a.sort) - rank(b.sort);
}

export function mapPromotions(payload: unknown): Promotion[] {
  if (isApiStatusFailure(payload)) throw new Error("Promotions request failed");
  return readPromotionItems(payload).flatMap((item, index) => {
    const title = text(item.name) || text(item.title);
    if (item.id == null || !title) return [];
    const headline = Array.isArray(item.headline)
      ? item.headline.map((line) => text(line)).filter(Boolean)
      : text(item.headline)
        ? text(item.headline).split("\n")
        : headlineFrom(title);
    const summary = text(item.summary);
    const content = text(item.content);
    const image = mediaUrl(text(item.image));
    return [
      {
        id: String(item.id),
        slug: text(item.promotion_code) || text(item.slug) || String(item.id),
        title,
        headline: headline.slice(0, 2),
        tagline: text(item.tagline) || summary,
        summary,
        terms: Array.isArray(item.terms) ? item.terms.filter((term) => text(term)) : [],
        content: content ? mediaUrlHtml(content) : undefined,
        startDate: text(item.start_date),
        endDate: text(item.end_date),
        image: image || undefined,
        icon: ICONS.find((icon) => icon === item.icon) ?? "gem",
        sort: typeof item.sequence === "number" ? item.sequence : (item.sort ?? index + 1),
      },
    ];
  });
}

// Rewrite root-relative src/href in the CMS HTML so images load from the API host.
function mediaUrlHtml(html: string): string {
  const origin = (apiConfig.baseUrl || "").replace(/\/api\/?$/, "");
  if (!origin) return html;
  return html.replace(/(\s(?:src|href)=["'])\/(?!\/)/gi, `$1${origin}/`);
}

const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_PROMOTIONS_PATH = "/promotion";

function fromStatic(lang: string): PromotionsResult {
  const locale = uiLocale(lang);
  const promotions = staticPromotions.map(({ text, ...promo }) => ({ ...promo, ...(text[locale] ?? text.en) }));
  return { promotions: promotions.sort((a, b) => a.sort - b.sort) };
}

async function fromApi(lang: string): Promise<PromotionsResult> {
  "use cache";
  cacheTag("promotions");

  try {
    // POST /promotion. Locale is a body field (APIController sets app locale from it).
    // country-id selects the page list. No token: the list is public.
    const payload = await apiJson(apiConfig.promotionsPath || DEFAULT_PROMOTIONS_PATH, {
      method: "POST",
      auth: false,
      headers: {
        "Content-Type": "application/json",
        "country-id": apiConfig.lobbyCountryId || "1",
      },
      body: JSON.stringify({ locale: lobbyLocale(lang) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const promotions = mapPromotions(payload).sort(bySequence);
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
