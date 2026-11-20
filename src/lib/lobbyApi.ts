import { apiConfig } from "@/config/site";
import { apiJson } from "@/lib/api";
import { isLanguageCode } from "@/i18n/languages";
import type { Game, GameSymbol } from "@/config/lobby";
import type { Provider } from "@/config/providers";

// Product and game list helpers for the configured API (NEXT_PUBLIC_API_BASE_URL).
// GET /config returns products at `data.product`. The lobby locates a product by
// `public_code`. POST /game_list takes `{ public_code }` plus a `country-id` header.
// Omit `public_code` to get every provider's games. The internal `code` is not sent.

const PALETTE: [string, string][] = [
  ["#f59e0b", "#7c2d12"],
  ["#16a34a", "#14532d"],
  ["#0ea5e9", "#0c4a6e"],
  ["#a855f7", "#3b0764"],
  ["#ef4444", "#7f1d1d"],
  ["#6366f1", "#1e1b4b"],
];
const SYMBOLS: GameSymbol[] = ["reel", "seven", "star", "coin", "crown", "lantern"];
const ACCENTS = ["#ffb020", "#7dff6a", "#e6edf0", "#4cc3ff", "#ff7ad9", "#c9a3ff", "#5ef0c4", "#ff6b6b"];

// URL language slug -> the `locale` the API expects (APIController reads $request->locale).
// Slugs are backend codes already (en, cn, bm); old UI ids zh / ms are mapped. Any other
// configured code is passed through as it is; something that is not a code is English.
export function lobbyLocale(lang: string): string {
  const value = lang.trim().toLowerCase();
  if (value === "zh" || value === "cn") return "cn";
  if (value === "ms" || value === "bm") return "bm";
  return isLanguageCode(value) ? value : "en";
}

function hash(text: string) {
  let h = 0;
  for (const char of text) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}

type RawProduct = {
  code?: unknown;
  public_code?: unknown;
  name?: unknown;
  type?: unknown;
  category?: unknown;
  image?: unknown;
  status?: unknown;
  sequence?: unknown;
  products?: unknown;
};

// Backend Product::CATEGORY_SPORTS. Sports products and the Sports category group are
// left out of the lobby (providers, categories). The sports page still finds its product
// through parseProductsWithStatus, which keeps them.
const SPORTS_CATEGORY = 2;

function isSports(raw: { category?: unknown }): boolean {
  return Number(raw.category) === SPORTS_CATEGORY;
}

type RawGroup = {
  title?: unknown;
  category?: unknown;
  products?: unknown;
  product_code?: unknown;
  type?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readGroups(payload: unknown): RawGroup[] {
  const root = asRecord(payload);
  if (!root) return Array.isArray(payload) ? (payload as RawGroup[]) : [];

  const data = asRecord(root.data);
  const fromConfig = data?.product ?? root.product;
  if (Array.isArray(fromConfig)) return fromConfig as RawGroup[];

  return [];
}

function monogram(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toProvider(raw: RawProduct, group?: string): Provider | null {
  // Locate by public_code. `code` stays on the product record; game_list does not use it.
  const id = text(raw.public_code);
  const code = text(raw.code);
  const name = text(raw.name);
  if (!id || !code || !name) return null;
  if (raw.status != null && raw.status !== 1) return null;
  if (isSports(raw)) return null;
  const image = typeof raw.image === "string" && raw.image ? raw.image : undefined;
  const type = Number(raw.type);
  return {
    id,
    code,
    ...(Number.isInteger(type) && type > 0 ? { type } : {}),
    name,
    mark: monogram(name),
    accent: ACCENTS[hash(id) % ACCENTS.length],
    image,
    group,
  };
}

export function parseProducts(payload: unknown): Provider[] {
  const groups = readGroups(payload);
  const seen = new Set<string>();
  const providers: Provider[] = [];

  for (const group of groups) {
    const rec = asRecord(group) as RawGroup | null;
    if (!rec) continue;
    const title = typeof rec.title === "string" ? rec.title : undefined;
    const nested = Array.isArray(rec.products) ? (rec.products as RawProduct[]) : [];
    // A flat config list item already has `code` and no nested products.
    if (nested.length === 0 && "code" in rec) {
      const provider = toProvider(rec as RawProduct, title);
      if (provider && !seen.has(provider.id)) {
        seen.add(provider.id);
        providers.push(provider);
      }
      continue;
    }
    for (const item of nested) {
      const provider = toProvider(item, title);
      if (!provider || seen.has(provider.id)) continue;
      seen.add(provider.id);
      providers.push(provider);
    }
  }

  return providers;
}

type RawGame = {
  id?: unknown;
  name?: unknown;
  image?: unknown;
  code?: unknown;
  game_code?: unknown;
  public_code?: unknown;
  provider_name?: unknown;
  rtp?: unknown;
};

function toGame(raw: RawGame, fallbackProvider = ""): Game | null {
  if (raw.id == null || typeof raw.name !== "string" || !raw.name.trim()) return null;
  const id = String(raw.id);
  const [from, to] = PALETTE[hash(id) % PALETTE.length];
  const image = typeof raw.image === "string" && raw.image ? raw.image : undefined;
  const provider = text(raw.provider_name) || fallbackProvider;
  const gameCode = text(raw.game_code);
  const rtp = typeof raw.rtp === "number" && Number.isFinite(raw.rtp) ? raw.rtp : undefined;
  return {
    id,
    title: raw.name.trim(),
    provider,
    ...(gameCode ? { gameCode } : {}),
    playing: 0,
    tags: [],
    from,
    to,
    symbol: SYMBOLS[hash(id) % SYMBOLS.length],
    image,
    ...(rtp !== undefined ? { rtp, edge: Math.round((100 - rtp) * 100) / 100 } : {}),
  };
}

function pushGame(
  raw: unknown,
  publicCode: string | undefined,
  providerName: string,
  games: Game[],
  seen: Set<string>,
) {
  const game = toGame(raw as RawGame, providerName);
  if (!game || seen.has(game.id)) return;
  seen.add(game.id);
  // Nested lists put public_code on the provider wrapper; the paginated flat
  // list puts it on each game row.
  const code = text((raw as RawGame).public_code) || publicCode;
  games.push(code ? { ...game, publicCode: code } : game);
}

// One provider is `{ public_code, name, games: [{ category, games: [game, ...] }] }`.
// A category bucket is `{ category, games: [game, ...] }`. Flatten both.
// Nested game rows often omit provider_name; the wrapper `name` is the display name.
function collectGames(
  node: unknown,
  publicCode: string | undefined,
  providerName: string,
  games: Game[],
  seen: Set<string>,
) {
  const rec = asRecord(node);
  if (!rec) return;
  const code = text(rec.public_code) || publicCode;
  const name = text(rec.public_code) && text(rec.name) ? text(rec.name) : providerName;
  if (!Array.isArray(rec.games)) {
    pushGame(rec, code, name, games, seen);
    return;
  }
  for (const item of rec.games) {
    const child = asRecord(item);
    if (child && Array.isArray(child.games)) {
      collectGames(child, code, name, games, seen);
      continue;
    }
    pushGame(item, code, name, games, seen);
  }
}

export function parseGameList(payload: unknown): Game[] {
  const root = asRecord(payload);
  const data = root?.data ?? payload;
  // Paginated POST /game_list?limit=…: data is { games, total, page, limit, last_page }.
  // Unpaginated (no limit): data is the nested provider + category tree.
  const envelope = asRecord(data);
  if (envelope && Array.isArray(envelope.games) && !Array.isArray(data)) {
    const games: Game[] = [];
    const seen = new Set<string>();
    for (const item of envelope.games) pushGame(item, undefined, "", games, seen);
    return games;
  }
  const groups = Array.isArray(data) ? data : [data];
  const games: Game[] = [];
  const seen = new Set<string>();
  for (const group of groups) collectGames(group, undefined, "", games, seen);
  return games;
}

function readInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export type LobbyGamesPage = {
  games: Game[];
  total?: number;
  page?: number;
  limit?: number;
  lastPage?: number;
  error?: boolean;
};

// Reads total/page/limit/last_page from data or the top level (either placement).
export function parseGameListPage(payload: unknown): LobbyGamesPage {
  const games = parseGameList(payload);
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  return {
    games,
    total: readInt(data?.total) ?? readInt(root?.total),
    page: readInt(data?.page) ?? readInt(root?.page),
    limit: readInt(data?.limit) ?? readInt(root?.limit),
    lastPage: readInt(data?.last_page) ?? readInt(root?.last_page),
  };
}

function lobbyCountryId() {
  return apiConfig.lobbyCountryId || "1";
}

export const LOBBY_HOME_CATEGORY = -1;
export const LOBBY_ALL_CATEGORY = 0;

// One entry from GET /config `data.product` (Product::product_categories_format).
// `title` is already localized. `publicCodes` are the products in that category
// (empty on the All category, meaning no provider filter). Home (-1) is omitted.
export type LobbyProductCategory = {
  id: number;
  title: string;
  publicCodes: string[];
};

export function parseProductCategories(payload: unknown): LobbyProductCategory[] {
  const groups = readGroups(payload);
  const codeToPublic = new Map<string, string>();
  for (const group of groups) {
    const rec = asRecord(group) as RawGroup | null;
    const nested = Array.isArray(rec?.products) ? (rec?.products as RawProduct[]) : [];
    for (const item of nested) {
      if (isSports(item)) continue;
      const code = text(item.code);
      const publicCode = text(item.public_code);
      if (code && publicCode) codeToPublic.set(code, publicCode);
    }
  }

  const categories: LobbyProductCategory[] = [];
  for (const group of groups) {
    const rec = asRecord(group) as RawGroup | null;
    if (!rec) continue;
    const id = Number(rec.category);
    if (!Number.isFinite(id) || id === LOBBY_HOME_CATEGORY || id === SPORTS_CATEGORY) continue;
    const title = text(rec.title);
    if (!title) continue;

    if (id === LOBBY_ALL_CATEGORY) {
      categories.push({ id, title, publicCodes: [] });
      continue;
    }

    const publicCodes: string[] = [];
    const nested = Array.isArray(rec.products) ? (rec.products as RawProduct[]) : [];
    for (const item of nested) {
      if (isSports(item)) continue;
      const publicCode = text(item.public_code);
      if (publicCode && !publicCodes.includes(publicCode)) publicCodes.push(publicCode);
    }
    // TYPE_PROVIDER categories carry an internal `product_code` and an empty products list.
    const productCode = text(rec.product_code);
    if (productCode) {
      const publicCode = codeToPublic.get(productCode) ?? "";
      if (publicCode && !publicCodes.includes(publicCode)) publicCodes.push(publicCode);
    }
    if (publicCodes.length === 0) continue;
    categories.push({ id, title, publicCodes });
  }

  if (!categories.some((item) => item.id === LOBBY_ALL_CATEGORY)) {
    categories.unshift({ id: LOBBY_ALL_CATEGORY, title: "", publicCodes: [] });
  }
  return categories;
}

export async function fetchLobbyCatalog(locale: string): Promise<{
  providers: Provider[];
  categories: LobbyProductCategory[];
}> {
  if (!apiConfig.baseUrl) return { providers: [], categories: [] };
  const query = `?locale=${encodeURIComponent(locale)}`;
  try {
    const payload = await apiJson(`${apiConfig.configPath}${query}`, {
      method: "GET",
      auth: false,
      cache: "no-store",
    });
    return { providers: parseProducts(payload), categories: parseProductCategories(payload) };
  } catch {
    return { providers: [], categories: [] };
  }
}

export async function fetchLobbyProducts(locale: string): Promise<Provider[]> {
  if (!apiConfig.baseUrl) return [];
  const query = `?locale=${encodeURIComponent(locale)}`;
  try {
    const payload = await apiJson(`${apiConfig.configPath}${query}`, {
      method: "GET",
      auth: false,
      cache: "no-store",
    });
    return parseProducts(payload);
  } catch {
    return [];
  }
}

// A product record that keeps `status` from GET /config. Unlike parseProducts /
// toProvider (lobby lists, status 1 only), this includes maintenance and coming-soon
// items so the sports page can show a status card. Hidden(7)/inactive(8) are normally
// filtered out by the backend already.
export type LobbyProductRecord = Provider & { status: number };

export type LobbyProductLookup =
  | { ok: true; product: LobbyProductRecord | null }
  | { ok: false };

function toProductRecord(raw: RawProduct, group?: string): LobbyProductRecord | null {
  const id = text(raw.public_code);
  const code = text(raw.code);
  const name = text(raw.name);
  if (!id || !code || !name) return null;
  const statusNum = Number(raw.status);
  const status = Number.isFinite(statusNum) ? statusNum : 1;
  const image = typeof raw.image === "string" && raw.image ? raw.image : undefined;
  const type = Number(raw.type);
  return {
    id,
    code,
    ...(Number.isInteger(type) && type > 0 ? { type } : {}),
    name,
    mark: monogram(name),
    accent: ACCENTS[hash(id) % ACCENTS.length],
    image,
    group,
    status,
  };
}

export function parseProductsWithStatus(payload: unknown): LobbyProductRecord[] {
  const groups = readGroups(payload);
  const seen = new Set<string>();
  const products: LobbyProductRecord[] = [];

  for (const group of groups) {
    const rec = asRecord(group) as RawGroup | null;
    if (!rec) continue;
    const title = typeof rec.title === "string" ? rec.title : undefined;
    const nested = Array.isArray(rec.products) ? (rec.products as RawProduct[]) : [];
    if (nested.length === 0 && "code" in rec) {
      const product = toProductRecord(rec as RawProduct, title);
      if (product && !seen.has(product.id)) {
        seen.add(product.id);
        products.push(product);
      }
      continue;
    }
    for (const item of nested) {
      const product = toProductRecord(item, title);
      if (!product || seen.has(product.id)) continue;
      seen.add(product.id);
      products.push(product);
    }
  }

  return products;
}

// Fetch GET /config and return the BO-selected sports product (data.sports_product),
// including non-active statuses. No sports_product set -> product null. `{ ok: false }` means the request itself failed (network /
// missing API base) — callers must not treat that as "product missing".
export async function lookupSportsProduct(locale: string): Promise<LobbyProductLookup> {
  if (!apiConfig.baseUrl) return { ok: false };
  const query = `?locale=${encodeURIComponent(locale)}`;
  try {
    const payload = await apiJson(`${apiConfig.configPath}${query}`, {
      method: "GET",
      auth: false,
      cache: "no-store",
    });
    const products = parseProductsWithStatus(payload);
    const preferred = text(asRecord(asRecord(payload)?.data)?.sports_product);
    const product = (preferred && products.find((item) => item.id === preferred)) || null;
    return { ok: true, product };
  } catch {
    return { ok: false };
  }
}

// One game from a provider's list, plus the other games in that list (the game page's
// recommended row). `publicCode` is the product's public_code. `gameCode` is the inner
// game code used in the page path (/casino/{category}/provider/{publicCode}/game/{gameCode}).
export async function findLobbyGame(
  publicCode: string,
  gameCode: string,
  locale: string,
): Promise<{ game: Game; others: Game[] } | null> {
  const product = (await fetchLobbyProducts(locale)).find((item) => item.id === publicCode);
  if (!product) return null;
  const games = (await fetchLobbyGames(locale, product.id)).map((game) => ({
    ...game,
    publicCode: product.id,
  }));
  const game = games.find((item) => item.gameCode === gameCode);
  if (!game) return null;
  return { game, others: games.filter((item) => item.gameCode !== gameCode) };
}

export type LobbyGamesPaging = {
  page?: number; // default 1 on the API
  limit?: number; // max 100; omit to get the old nested all-at-once list
};

// `publicCode` filters one provider. Omit it for every provider's games.
// Pass `paging.limit` to get the flat paginated list (data.games + total/page/limit/last_page).
// Without limit the API keeps the old nested provider+category shape.
export async function loadLobbyGames(
  locale: string,
  publicCode?: string,
  paging?: LobbyGamesPaging,
): Promise<LobbyGamesPage> {
  if (!apiConfig.baseUrl) return { games: [] };
  try {
    const body: Record<string, unknown> = {};
    if (publicCode) body.public_code = publicCode;
    if (paging?.page != null) body.page = paging.page;
    if (paging?.limit != null) body.limit = paging.limit;
    const query = new URLSearchParams({ locale });
    if (typeof body.page === "number") query.set("page", String(body.page));
    if (typeof body.limit === "number") query.set("limit", String(body.limit));
    const payload = await apiJson(`${apiConfig.gameListPath}?${query}`, {
      method: "POST",
      auth: false,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "country-id": lobbyCountryId(),
      },
      body: JSON.stringify(body),
    });
    return parseGameListPage(payload);
  } catch {
    return { games: [], error: true };
  }
}

export async function fetchLobbyGames(locale: string, publicCode?: string, paging?: LobbyGamesPaging): Promise<Game[]> {
  const result = await loadLobbyGames(locale, publicCode, paging);
  return result.games;
}

export function providersForCategory(providers: Provider[], slug?: string): Provider[] {
  if (!slug) return providers;
  const key = slug === "live-dealer" ? "live" : slug === "slots" ? "slot" : "";
  if (!key) return providers;
  const filtered = providers.filter((provider) => (provider.group ?? "").toLowerCase().includes(key));
  return filtered.length > 0 ? filtered : providers;
}

// Limit the provider row to the public_codes of one GET /config product category.
// An empty list means the All category (no extra filter).
export function providersInCodes(providers: Provider[], publicCodes?: string[]): Provider[] {
  if (!publicCodes || publicCodes.length === 0) return providers;
  const allowed = new Set(publicCodes);
  return providers.filter((provider) => allowed.has(provider.id));
}
