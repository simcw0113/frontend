import { cacheLife, cacheTag } from "next/cache";
import { apiConfig } from "@/config/site";
import { gameCatalog, type CatalogGame } from "@/config/gameCatalog";
import { categoryGames, type Game, type GameSymbol, type GameTag } from "@/config/lobby";
import type { SearchCategoryId } from "@/config/searchCategories";
import { apiJson } from "@/lib/api";
import { useStaticData as isStaticData } from "@/lib/apiMode";

// Game lists per casino category (/{lang}/casino/{category} and the home rows).
// This is the ONE place that talks to the games API; pages only call
// getCategoryGames(). Runs on the server only.
//
// Static vs API: apiConfig.useStaticGames (config/site.ts) is true while
// NEXT_PUBLIC_API_BASE_URL is empty, and the lists come from config/lobby.ts
// (`categoryGames[slug]`). Set the env var and the API is used instead.
//
// Caching (Next 16 Cache Components): the API call lives in a `use cache`
// function keyed by (category, lang, provider, page, q), tagged `games:${category}`
// so revalidateTag(`games:slots`) refreshes one category. Public lists only: a
// cached scope cannot read cookies/headers and the localStorage token is not
// visible on the server, so NO auth token is sent here (auth: false). Authenticated
// calls should go through the planned cookie/proxy approach (a route handler or
// server action that reads an httpOnly cookie), and still be called from this file.
// The static path skips the cache and is prerendered at build time. A failed API
// call gets a zero cache life (see fromApi), so an outage at build time is not
// baked into the static page and an error is never cached.

// --- Types ------------------------------------------------------------------

// TODO(API): shape of one game in the API response. Adjust to the real fields.
export type GameDto = {
  id: string | number;
  name: string;
  provider?: string | { name?: string };
  players?: number;
  tags?: string[];
  image?: string; // cover URL, rendered by GameCover (gradient + symbol without it)
};

// TODO(API): shape of the list response. Adjust to the real envelope.
export type CategoryGamesDto = {
  data?: GameDto[] | { items?: GameDto[]; total?: number; next_page?: number | null };
  items?: GameDto[];
  total?: number;
  next_page?: number | null;
};

export type CategoryGamesOptions = {
  lang: string; // URL language slug: en | cn | de | es
  provider?: string; // provider id from config/providers.ts
  page?: number; // 1-based
  q?: string; // server-side search text (the lobby filters client-side for now)
};

export type CategoryGamesResult = {
  games: Game[];
  total?: number;
  nextPage?: number;
  error?: boolean; // the API failed: show the error state instead of "nothing here"
};

// --- Mapping ----------------------------------------------------------------

const PALETTE: [string, string][] = [
  ["#f59e0b", "#7c2d12"],
  ["#16a34a", "#14532d"],
  ["#0ea5e9", "#0c4a6e"],
  ["#a855f7", "#3b0764"],
  ["#ef4444", "#7f1d1d"],
  ["#6366f1", "#1e1b4b"],
];
const SYMBOLS: GameSymbol[] = ["reel", "seven", "star", "coin", "crown", "lantern"];
const TAGS: GameTag[] = ["slots", "house", "halloween", "fishing", "live", "bonus", "wagering", "new"];

function hash(text: string) {
  let h = 0;
  for (const char of text) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}

// TODO(API): map the real response onto Game. `image` is the cover; without one the
// card draws a gradient + symbol picked from the id.
export function mapGame(dto: GameDto): Game {
  const id = String(dto.id);
  const [from, to] = PALETTE[hash(id) % PALETTE.length];
  return {
    id,
    title: dto.name,
    provider: typeof dto.provider === "string" ? dto.provider : (dto.provider?.name ?? ""),
    playing: dto.players ?? 0,
    tags: (dto.tags ?? []).filter((tag): tag is GameTag => TAGS.includes(tag as GameTag)),
    from,
    to,
    symbol: SYMBOLS[hash(id) % SYMBOLS.length],
    image: dto.image || undefined, // the API cover; GameCover falls back to gradient + symbol
  };
}

// TODO(API): unwrap the real envelope (data / items / pagination fields).
export function mapResponse(payload: CategoryGamesDto | GameDto[]): CategoryGamesResult {
  const body = Array.isArray(payload) ? { items: payload } : payload;
  const inner = Array.isArray(body.data) ? { items: body.data } : (body.data ?? body);
  const items = (inner as { items?: GameDto[] }).items;
  if (!Array.isArray(items)) throw new Error("Unexpected games response");
  const next = (inner as { next_page?: number | null }).next_page;
  return {
    games: items.map(mapGame),
    total: (inner as { total?: number }).total,
    nextPage: typeof next === "number" ? next : undefined,
  };
}

// --- Sources ----------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 8000;

// Defensive reads of apiConfig: a stale dev module graph (HMR) can hand us an older
// config object without these keys. A missing switch then means "static data unless
// an API address exists", and a missing path falls back to the documented default,
// instead of throwing while the page renders.
const DEFAULT_CATEGORY_PATH = "/games/category/{category}";
const DEFAULT_SEARCH_PATH = "/games/search";
function staticGamesEnabled(): boolean {
  const config: Partial<typeof apiConfig> = apiConfig;
  return isStaticData(config.useStaticGames);
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fromStatic(category: string, opts: CategoryGamesOptions): CategoryGamesResult {
  const needle = opts.q?.trim().toLowerCase();
  const games = (categoryGames[category] ?? []).filter(
    (game) =>
      (!needle || game.title.toLowerCase().includes(needle)) &&
      (!opts.provider || slugify(game.provider) === opts.provider),
  );
  return { games, total: games.length };
}

// Never throws. A failure comes back as { games: [], error: true } and is given a
// zero cache life, so it is never reused and, while prerendering, is left to
// request time instead of being baked into the static page.
async function fromApi(category: string, opts: CategoryGamesOptions): Promise<CategoryGamesResult> {
  "use cache";
  cacheTag(`games:${category}`);

  const query = new URLSearchParams({ lang: opts.lang });
  if (opts.provider) query.set("provider", opts.provider);
  if (opts.page && opts.page > 1) query.set("page", String(opts.page));
  if (opts.q) query.set("q", opts.q);

  try {
    // TODO(API): endpoint path lives in apiConfig.categoryGamesPath (config/site.ts).
    const template = apiConfig.categoryGamesPath || DEFAULT_CATEGORY_PATH;
    const path = template.replace("{category}", encodeURIComponent(category));
    const payload = await apiJson<CategoryGamesDto | GameDto[]>(`${path}?${query}`, {
      auth: false,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), // timeouts and network errors land in catch
    });
    const result = mapResponse(payload);
    // Public list: 5 min fresh, refreshed in the background after 5 min, dropped
    // after 1 h. stale >= 30 s and expire >= 5 min keep it in prerenders.
    cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
    return result;
  } catch {
    cacheLife({ stale: 0, revalidate: 0, expire: 0 });
    return { games: [], error: true };
  }
}

// Never throws: failures come back as { games: [], error: true }.
export async function getCategoryGames(
  category: string,
  opts: CategoryGamesOptions,
): Promise<CategoryGamesResult> {
  return staticGamesEnabled() ? fromStatic(category, opts) : fromApi(category, opts);
}

// --- "Explore" search -------------------------------------------------------
// Called from the browser through the route handler app/api/games/search/route.ts
// (never directly), so the API address, and later the auth token, stay on the
// server. Searches are not cached (the query space is open-ended); the handler
// answers with Cache-Control: no-store.
//
// TODO(API): when the endpoint needs the signed-in user, read the HttpOnly cookie
// with cookies() in the route handler and pass the token in here as an
// Authorization header. Do not add token handling in the browser.

export const SEARCH_PAGE_SIZE = 24;

export type SearchGamesOptions = {
  q: string; // already trimmed and length-capped by the caller
  category: SearchCategoryId;
  page: number; // 1-based
  pageSize: number;
  lang: string; // URL language slug: en | cn | de | es
  signal?: AbortSignal;
};

export type SearchGamesResult = {
  games: Game[];
  total: number;
  nextPage?: number; // absent on the last page
};

// Drops the catalog-only category tags.
function toGame({ id, title, provider, playing, tags, from, to, symbol }: CatalogGame): Game {
  return { id, title, provider, playing, tags, from, to, symbol };
}

function searchStatic({ q, category, page, pageSize }: SearchGamesOptions): SearchGamesResult {
  const needle = q.toLowerCase();
  const matches = gameCatalog.filter(
    (game) =>
      (category === "all" || game.categories.some((id) => id === category)) &&
      (!needle || game.title.toLowerCase().includes(needle) || game.provider.toLowerCase().includes(needle)),
  );
  const start = (page - 1) * pageSize;
  return {
    games: matches.slice(start, start + pageSize).map(toGame),
    total: matches.length,
    nextPage: start + pageSize < matches.length ? page + 1 : undefined,
  };
}

async function searchApi(opts: SearchGamesOptions): Promise<SearchGamesResult> {
  // TODO(API): endpoint path is apiConfig.searchGamesPath (config/site.ts); rename
  // the query parameters here if the API uses other names.
  const query = new URLSearchParams({
    category: opts.category,
    page: String(opts.page),
    pageSize: String(opts.pageSize),
    lang: opts.lang,
  });
  if (opts.q) query.set("q", opts.q);
  const payload = await apiJson<CategoryGamesDto | GameDto[]>(`${apiConfig.searchGamesPath || DEFAULT_SEARCH_PATH}?${query}`, {
    auth: false,
    signal: opts.signal ? AbortSignal.any([opts.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]) : AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  // TODO(API): mapResponse is the shared (placeholder) mapper; replace it if the
  // search response differs from the category list response.
  const result = mapResponse(payload);
  return { games: result.games, total: result.total ?? result.games.length, nextPage: result.nextPage };
}

// Throws when the API fails (the route handler turns that into a 502).
export async function searchGames(opts: SearchGamesOptions): Promise<SearchGamesResult> {
  return staticGamesEnabled() ? searchStatic(opts) : searchApi(opts);
}
