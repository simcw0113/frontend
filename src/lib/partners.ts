import { cacheLife, cacheTag } from "next/cache";
import { apiConfig } from "@/config/site";
import { staticPartners, type Partner } from "@/config/partners";
import { apiJson } from "@/lib/api";
import { useStaticData as isStaticData } from "@/lib/apiMode";
import { lobbyLocale } from "@/lib/lobbyApi";

// "Our Partners" for the lobby home page. Server only. Same pattern as lib/topWins.ts:
// static placeholder data while there is no API address (apiConfig.useStaticPartners, see
// lib/apiMode.ts), otherwise a cached public API call that never throws and never sends
// an auth token (see the notes in lib/games.ts).

export type PartnersResult = { partners: Partner[]; error?: boolean };

// TODO(API): shape of one entry in the API response. Adjust to the real fields.
export type PartnerDto = {
  id: string | number;
  name: string;
  logo?: string; // image URL
  logo_url?: string;
};

// TODO(API): map the real response onto Partner (and unwrap its envelope). Entries without a
// logo get the placeholder wordmark; a logo URL replaces it.
export function mapPartners(payload: { data?: PartnerDto[] } | PartnerDto[]): Partner[] {
  const items = Array.isArray(payload) ? payload : payload.data;
  if (!Array.isArray(items)) throw new Error("Unexpected partners response");
  return items.map((item) => ({
    id: String(item.id),
    name: item.name,
    logo: item.logo ?? item.logo_url,
  }));
}

const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_PARTNERS_PATH = "/partners";

async function fromApi(lang: string): Promise<PartnersResult> {
  "use cache";
  cacheTag("partners");

  try {
    // TODO(API): endpoint path lives in apiConfig.partnersPath (config/site.ts).
    const payload = await apiJson<{ data?: PartnerDto[] } | PartnerDto[]>(
      `${apiConfig.partnersPath || DEFAULT_PARTNERS_PATH}?${new URLSearchParams({ lang, locale: lobbyLocale(lang) })}`,
      { auth: false, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );
    const partners = mapPartners(payload);
    cacheLife({ stale: 3600, revalidate: 3600, expire: 86400 });
    return { partners };
  } catch {
    cacheLife({ stale: 0, revalidate: 0, expire: 0 }); // never cache a failure
    return { partners: [], error: true };
  }
}

// Never throws. The section hides itself on `error` or an empty list.
export async function getPartners({ lang }: { lang: string }): Promise<PartnersResult> {
  const config: Partial<typeof apiConfig> = apiConfig;
  return isStaticData(config.useStaticPartners) ? { partners: staticPartners } : fromApi(lang);
}
