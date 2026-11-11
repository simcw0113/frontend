import { cacheLife, cacheTag } from "next/cache";
import { bannerSlides, type BannerSlide } from "@/config/banners";
import { apiConfig } from "@/config/site";
import { apiJson } from "@/lib/api";
import { lobbyLocale } from "@/lib/lobbyApi";

// Home banner. GET /config `data.banners` is Carousel::fetch for the country-id
// header (desktop_image / mobile_image are the locale's URL, link is optional).
// An empty list or a failed request keeps the sample slides in config/banners.ts.

const REQUEST_TIMEOUT_MS = 8000;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// A translated image is either the locale string or { en, cn, ... }.
function imageUrl(value: unknown, locale: string): string {
  const direct = text(value);
  if (direct) return direct;
  const record = asRecord(value);
  if (!record) return "";
  const preferred = [locale, locale === "cn" ? "zh" : "", "en"];
  for (const key of preferred) {
    if (!key) continue;
    const hit = text(record[key]);
    if (hit) return hit;
  }
  for (const item of Object.values(record)) {
    const hit = text(item);
    if (hit) return hit;
  }
  return "";
}

function hrefOf(value: unknown): string | undefined {
  const href = text(value);
  if (!href || href === "#") return undefined;
  if (href.startsWith("/") || href.startsWith("https://") || href.startsWith("http://")) return href;
  return undefined;
}

export function parseBanners(payload: unknown, locale: string): BannerSlide[] {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const list = data?.banners ?? root?.banners;
  if (!Array.isArray(list)) return [];

  const slides: BannerSlide[] = [];
  list.forEach((item, index) => {
    const raw = asRecord(item);
    if (!raw) return;
    const desktop = imageUrl(raw.desktop_image, locale);
    const mobile = imageUrl(raw.mobile_image, locale);
    const imageUrlValue = desktop || mobile;
    if (!imageUrlValue) return;
    const id = text(raw.id) || String(raw.id ?? index + 1);
    const href = hrefOf(raw.link);
    slides.push({
      id,
      imageUrl: imageUrlValue,
      ...(mobile && mobile !== imageUrlValue ? { mobileUrl: mobile } : {}),
      ...(href ? { href } : {}),
    });
  });
  return slides;
}

async function fromApi(lang: string): Promise<BannerSlide[]> {
  "use cache";
  cacheTag("home-banners");

  const locale = lobbyLocale(lang);
  try {
    const payload = await apiJson(`${apiConfig.configPath}?locale=${encodeURIComponent(locale)}`, {
      auth: false,
      headers: { "country-id": apiConfig.lobbyCountryId || "1" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const slides = parseBanners(payload, locale);
    cacheLife({ stale: 60, revalidate: 60, expire: 3600 });
    return slides.length > 0 ? slides : bannerSlides;
  } catch {
    cacheLife({ stale: 0, revalidate: 0, expire: 0 });
    return bannerSlides;
  }
}

// Never throws. Home always receives at least the sample slides.
export async function getHomeBanners({ lang }: { lang: string }): Promise<BannerSlide[]> {
  if (!apiConfig.baseUrl) return bannerSlides;
  return fromApi(lang);
}
