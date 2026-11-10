import { apiConfig } from "@/config/site";
import { apiJson } from "@/lib/api";
import type { Game, GameSymbol } from "@/config/lobby";
import type { Provider } from "@/config/providers";

// Product and game list helpers for the configured API (NEXT_PUBLIC_API_BASE_URL).
// GET /config returns products at `data.product`. Each product has an internal
// `code` and a `public_code`. The lobby locates a product by `public_code`.
// POST /game_list still takes the internal code: `{ code: "<product code>" }`
// plus a `country-id` header. `public_code` is not accepted there.

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

export function lobbyLocale(lang: string): string {
  if (lang === "zh" || lang === "cn") return "cn";
  return "en";
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
  image?: unknown;
  status?: unknown;
  sequence?: unknown;
  products?: unknown;
};

type RawGroup = {
  title?: unknown;
  category?: unknown;
  products?: unknown;
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
  // Locate by public_code. Keep `code` only for POST /game_list.
  const id = text(raw.public_code);
  const code = text(raw.code);
  const name = text(raw.name);
  if (!id || !code || !name) return null;
  if (raw.status != null && raw.status !== 1) return null;
  const image = typeof raw.image === "string" && raw.image ? raw.image : undefined;
  return {
    id,
    code,
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
};

function toGame(raw: RawGame): Game | null {
  if (raw.id == null || typeof raw.name !== "string" || !raw.name.trim()) return null;
  const id = String(raw.id);
  const [from, to] = PALETTE[hash(id) % PALETTE.length];
  const image = typeof raw.image === "string" && raw.image ? raw.image : undefined;
  const provider = typeof raw.code === "string" ? raw.code : "";
  const gameCode = text(raw.game_code);
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
  };
}

export function parseGameList(payload: unknown): Game[] {
  const root = asRecord(payload);
  const data = root?.data ?? payload;
  const groups = Array.isArray(data) ? data : [];
  const games: Game[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    const rec = asRecord(group);
    const list = Array.isArray(rec?.games)
      ? (rec?.games as RawGame[])
      : rec && "name" in rec
        ? [rec as RawGame]
        : [];
    for (const item of list) {
      const game = toGame(item);
      if (!game || seen.has(game.id)) continue;
      seen.add(game.id);
      games.push(game);
    }
  }

  return games;
}

function lobbyCountryId() {
  return apiConfig.lobbyCountryId || "1";
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
  const games = (await fetchLobbyGames(product.code, locale)).map((game) => ({
    ...game,
    publicCode: product.id,
  }));
  const game = games.find((item) => item.gameCode === gameCode);
  if (!game) return null;
  return { game, others: games.filter((item) => item.gameCode !== gameCode) };
}

export async function fetchLobbyGames(code: string, locale: string): Promise<Game[]> {
  if (!apiConfig.baseUrl) return [];
  try {
    const payload = await apiJson(`${apiConfig.gameListPath}?locale=${encodeURIComponent(locale)}`, {
      method: "POST",
      auth: false,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "country-id": lobbyCountryId(),
      },
      body: JSON.stringify({ code }),
    });
    return parseGameList(payload);
  } catch {
    return [];
  }
}

export function providersForCategory(providers: Provider[], slug?: string): Provider[] {
  if (!slug) return providers;
  const key = slug === "live-dealer" ? "live" : slug === "slots" ? "slot" : "";
  if (!key) return providers;
  const filtered = providers.filter((provider) => (provider.group ?? "").toLowerCase().includes(key));
  return filtered.length > 0 ? filtered : providers;
}
