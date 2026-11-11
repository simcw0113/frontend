import { readFileSync } from "node:fs";
// Regression check for the lobby pages, run against a RUNNING server (no deps):
//   npm run dev   (or build && start), then:  npm run check:lobby
//   BASE_URL=http://localhost:3115 npm run check:lobby
// With no NEXT_PUBLIC_API_BASE_URL the home page must show "Top wins of the month"
// (static sample data) in every language, above the search bar, and the category
// pages must not. Home also shows "How to Register" right below Top wins and above the search
// bar (absent on category pages). "Our Partners" (home only) sits after the last game row and
// above the footer (an auto-scrolling row, no toggle); the top bar shows the logo image next to the sidebar toggle. Exits 1 on any failure.
const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const headings = { en: "Top wins of the month", cn: "本月最高赢奖", de: "Top-Gewinne des Monats", es: "Mayores premios del mes" };
const partnerTitles = { en: "Our Partners", cn: "合作伙伴", de: "Unsere Partner", es: "Nuestros socios" };

let failed = 0;
function check(name, ok) {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok) failed += 1;
}
async function page(path) {
  const response = await fetch(base + path, { redirect: "follow" });
  return { status: response.status, html: await response.text() };
}

for (const [lang, heading] of Object.entries(headings)) {
  const { status, html } = await page(`/${lang}`);
  const search = html.indexOf('id="lobby-search"');
  const wins = html.indexOf('id="top-wins-heading"');
  check(`/${lang} responds 200`, status === 200);
  check(`/${lang} has the Top wins section (${heading})`, wins > -1 && html.includes(heading));
  // The shell holds the Top wins skeleton (data-skeleton) and the content streams in later,
  // so the first skeleton marks where the section sits.
  const slot = html.indexOf("data-skeleton");
  check(`/${lang} Top wins is above the search bar`, search > -1 && slot > -1 && slot < search);
  check(`/${lang} Top wins shows amounts in USDT, none in MYR`, (html.match(/USDT/g) ?? []).length >= 6 && !html.includes("MYR"));
  check(`/${lang} masks player ids`, html.includes("••••••") && !html.includes("20481937"));

  // "How to Register": 4 steps, directly below Top wins (its skeleton marks the spot in the
  // shell) and above the search bar.
  const howTo = html.indexOf('id="how-to-register-title"');
  check(`/${lang} has How to Register with 4 steps`, howTo > -1 && (html.match(/class="howto-step"/g) ?? []).length === 4);
  check(`/${lang} order: Top wins, How to Register, search bar`, slot > -1 && howTo > slot && howTo < search);
  // "Our Partners": its skeleton (data-skeleton="partners") marks the spot in the shell, after
  // the game rows' skeletons and before the footer; the streamed content holds the tiles.
  const partnersSlot = html.indexOf('data-skeleton="partners"');
  const lastRow = html.lastIndexOf('data-skeleton=""');
  const footer = html.indexOf("<footer");
  check(`/${lang} Partners is below the last game row and above the footer`, partnersSlot > lastRow && lastRow > search && footer > partnersSlot);
  const partnersHtml = html.slice(html.indexOf('class="partners"'), html.indexOf("</section>", html.indexOf('class="partners"')));
  check(
    `/${lang} Partners shows 10 tiles and no See all / Show less toggle (${partnerTitles[lang]})`,
    html.includes(partnerTitles[lang]) && (partnersHtml.match(/class="partners-tile"/g) ?? []).length === 10 && !partnersHtml.includes("<button"),
  );
  // Top bar: the toggle comes first, the logo image (linked to the language home) right after it,
  // then the sign-in / join buttons. The centred title is gone.
  const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
  const toggle = header.indexOf("aria-expanded");
  const logo = header.indexOf('src="/brand/logo'); // siteConfig.logo (logo-lv.png for now)
  check(
    `/${lang} sidebar toggle is a labelled button with aria-expanded and aria-controls=lobby-sidebar`,
    header.includes('aria-controls="lobby-sidebar"') && html.includes('id="lobby-sidebar"'),
  );
  // Sidebar: the desktop toggle sits in its own top row; the header one is the drawer toggle
  // (below lg only). Every item has an icon and a label (kept as the accessible name when the
  // rail hides it), with a divider between the groups.
  const sidebar = html.slice(html.indexOf('<aside id="lobby-sidebar"'), html.indexOf("</aside>"));
  const items = [...sidebar.matchAll(/<(a|button)\b[^>]*class="[^"]*h-11[^"]*"[^>]*>([\s\S]*?)<\/\1>/g)];
  check(
    `/${lang} sidebar has its own toggle (aria-expanded, aria-controls) and the header toggle is lg:hidden`,
    /<button[^>]*aria-expanded="true"[^>]*aria-controls="lobby-sidebar"/.test(sidebar) && /<button[^>]*aria-controls="lobby-sidebar"[^>]*class="[^"]*lg:hidden/.test(header),
  );
  check(
    `/${lang} sidebar items (Home, Recent, Favourites | Promotions, Missions, VIP | Slots, Live Dealer, Sports | Language) each have an icon and a label, with dividers`,
    items.length === 10 && items.every(([, , inner]) => inner.includes("<svg") && /class="lobby-label[^"]*">[^<]+</.test(inner)) && (sidebar.match(/<hr/g) ?? []).length === 3,
  );
  // Groups (config/topNav.ts): Home + player pages | Promotions, VIP | games (same paths as the
  // top bar) | language selector.
  const groups = sidebar.split("<hr");
  const hrefsOf = (html) => [...(html ?? "").matchAll(/<a\b[^>]*href="([^"]*)"/g)].map((m) => m[1]);
  const expectGroups = [["", "/recent", "/favourites"], ["/promotions", "/missions", "/vip"], ["/casino/slots", "/casino/live-dealer", "/sports"]];
  check(
    `/${lang} sidebar groups: Home, Recent, Favourites | Promotions, Missions, VIP | Slots, Live Dealer, Sports | language`,
    expectGroups.every((paths, i) => hrefsOf(groups[i]).join() === paths.map((p) => `/${lang}${p}`).join()) && (groups[3] ?? "").includes("aria-expanded"),
  );
  check(
    `/${lang} header logo image sits right after the sidebar toggle, linking to /${lang}`,
    toggle > -1 && logo > toggle && !header.includes("font-serif") && header.slice(toggle, logo).includes(`href="/${lang}"`),
  );
  if (lang === "en") {
    check("/en step 1 is a button, the others are plain text", (html.match(/class="howto-action"/g) ?? []).length === 1);
  }
}
for (const path of ["/en/casino/slots", "/en/casino/trending-games"]) {
  const { status, html } = await page(path);
  check(`${path} responds 200 without Top wins`, status === 200 && !html.includes('id="top-wins-heading"'));
  check(`${path} has no How to Register`, !html.includes('id="how-to-register-title"'));
  check(`${path} has no Partners`, !html.includes('class="partners"') && !html.includes('data-skeleton="partners"'));
}
// Promotions: sidebar entry right below Home, the page in every language, 9 cards with
// Learn More, unknown sub-routes 404. (The detail pop-up is checked in a browser.)
const promoText = {
  en: ["Promotions", "Learn More"],
  cn: ["优惠活动", "了解更多"],
  de: ["Aktionen", "Mehr erfahren"],
  es: ["Promociones", "Más info"],
};
for (const [lang, [title, more]] of Object.entries(promoText)) {
  const home = await page(`/${lang}`);
  const aside = home.html.slice(home.html.indexOf('id="lobby-sidebar"'));
  const homeLink = aside.indexOf(`href="/${lang}"`);
  const promoLink = aside.indexOf(`href="/${lang}/promotions"`);
  const recentLink = aside.indexOf(`href="/${lang}/recent"`);
  const favLink = aside.indexOf(`href="/${lang}/favourites"`);
  check(
    `/${lang} sidebar has Recent Games and Favourites right below Home, then Promotions`,
    homeLink > -1 && recentLink > homeLink && favLink > recentLink && promoLink > favLink && !aside.slice(homeLink, promoLink).includes("<button"),
  );
  const { status, html } = await page(`/${lang}/promotions`);
  const cards = (html.match(/class="promo-card"/g) ?? []).length;
  const buttons = (html.match(new RegExp(`>${more}</button>`, "g")) ?? []).length;
  check(`/${lang}/promotions responds 200 with 9 cards, each with ${more} (${title})`, status === 200 && cards === 9 && buttons === 9 && html.includes(title));
  check(`/${lang}/promotions marks Promotions as the current page`, /aria-current="page"[^>]*href="\/[a-z]+\/promotions"|href="\/[a-z]+\/promotions"[^>]*aria-current="page"/.test(html));
  check(`/${lang}/promotions has no Top wins or search bar`, !html.includes('id="top-wins-heading"') && !html.includes('id="lobby-search"'));
}
for (const path of ["/en/promotions/nope", "/en/promotion"]) {
  const { status } = await page(path);
  check(`${path} is 404`, status === 404);
}
const sitemap = await page("/sitemap.xml");
check("sitemap lists /en/promotions", sitemap.html.includes("/en/promotions</loc>"));

// Top bar links (config/topNav.ts): 6 links in this order inside the header, the shown page's
// link marked aria-current="page". Live Dealer is its own page but no home row; Sports and VIP
// Sports and Z-AI are "Coming soon" placeholders. VIP is the sample club page.
const topNavPaths = ["/casino/slots", "/casino/live-dealer", "/sports", "/promotions", "/vip", "/z-ai"];
function topNavLinks(html) {
  const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
  const nav = header.slice(header.indexOf("<nav"), header.indexOf("</nav>"));
  return [...nav.matchAll(/<a\b[^>]*>/g)].map(([tag]) => ({
    href: tag.match(/href="([^"]*)"/)?.[1],
    current: tag.includes('aria-current="page"'),
  }));
}
const comingSoon = { en: "Coming soon", cn: "敬请期待", de: "Demnächst verfügbar", es: "Próximamente" };
for (const lang of Object.keys(comingSoon)) {
  const links = topNavLinks((await page(`/${lang}`)).html);
  check(
    `/${lang} top bar has 6 links in order (Slots, Live Dealer, Sports, Promotions, VIP, Z-AI), none current on home`,
    links.length === 6 && links.every((link, i) => link.href === `/${lang}${topNavPaths[i]}` && !link.current),
  );
  for (const path of ["/sports", "/z-ai"]) {
    const { status, html } = await page(`/${lang}${path}`);
    const current = topNavLinks(html).filter((link) => link.current).map((link) => link.href);
    check(
      `/${lang}${path} responds 200 with "${comingSoon[lang]}", its top link current, no search bar`,
      status === 200 && html.includes(comingSoon[lang]) && current.join() === `/${lang}${path}` && !html.includes('id="lobby-search"'),
    );
  }
  const vip = await page(`/${lang}/vip`);
  const vipCurrent = topNavLinks(vip.html).filter((link) => link.current).map((link) => link.href);
  check(
    `/${lang}/vip responds 200 with the sample club, its top link current, no search bar`,
    vip.status === 200 && vip.html.includes("data-vip-page") && vipCurrent.join() === `/${lang}/vip` && !vip.html.includes('id="lobby-search"'),
  );
}
{
  const header = (await page("/en")).html;
  const zai = header.slice(header.indexOf('href="/en/z-ai"'), header.indexOf("</a>", header.indexOf('href="/en/z-ai"')));
  check("/en Z-AI link is the featured pill, its text 'Z-AI' (icon hidden from screen readers)", zai.includes("zai-pill") && zai.includes(">Z-AI<") && /<svg[^>]*aria-hidden="true"/.test(zai));
}
for (const path of ["/en/casino/slots", "/en/promotions", "/en/casino/live-dealer", "/en/z-ai"]) {
  const current = topNavLinks((await page(path)).html).filter((link) => link.current).map((link) => link.href);
  check(`${path} marks only its own top link as current`, current.join() === path);
}
// Sidebar current page: only the matching sidebar link has aria-current="page" (none on the
// category pages that have no sidebar entry).
for (const [path, expected] of [["/en", "/en"], ["/en/recent", "/en/recent"], ["/en/favourites", "/en/favourites"], ["/en/vip", "/en/vip"], ["/en/missions", "/en/missions"], ["/en/casino/slots", "/en/casino/slots"], ["/en/casino/live-dealer", "/en/casino/live-dealer"], ["/en/sports", "/en/sports"], ["/en/casino/trending-games", ""]]) {
  const html = (await page(path)).html;
  const aside = html.slice(html.indexOf('<aside id="lobby-sidebar"'), html.indexOf("</aside>"));
  const current = [...aside.matchAll(/<a\b[^>]*>/g)].filter(([tag]) => tag.includes('aria-current="page"')).map(([tag]) => tag.match(/href="([^"]*)"/)?.[1]);
  check(`${path} sidebar marks ${expected || "no link"} as current`, current.join() === expected);
}
{
  const live = await page("/en/casino/live-dealer");
  check("/en/casino/live-dealer responds 200 with Live Dealer games", live.status === 200 && live.html.includes("Live Dealer") && live.html.includes("Lightning Roulette"));
  const home = await page("/en");
  const body = home.html.slice(home.html.indexOf("</header>"));
  check("/en home has no Live Dealer row", !body.includes('href="/en/casino/live-dealer"') && !body.includes("Lightning Roulette"));
  check("sitemap lists /en/casino/live-dealer, /en/sports, /en/vip and /en/z-ai", ["/en/casino/live-dealer", "/en/sports", "/en/vip", "/en/z-ai"].every((path) => sitemap.html.includes(`${path}</loc>`)));
}
for (const path of ["/en/casino/nope", "/en/sport", "/en/vip/nope"]) {
  const { status } = await page(path);
  check(`${path} is 404`, status === 404);
}

// Layout in a real browser (optional): CDP_URL=http://localhost:9222 (a Chrome started with
// --remote-debugging-port). Desktop (1440, 1024): sidebar from the very top at full height with
// its toggle inside, header and page starting at its right edge, expanded and collapsed (rail
// <= 72px, labels hidden but still named). Phone (390): drawer opens from the header toggle
// and closes with Esc. Skipped without CDP_URL.
if (process.env.CDP_URL) {
  const target = await (await fetch(`${process.env.CDP_URL}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => (ws.onopen = resolve));
  let seq = 0;
  const pending = new Map();
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) pending.get(message.id)(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve) => { const i = ++seq; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const hydrated = `new Promise((resolve) => { const t0 = Date.now(); (function poll() { const b = document.querySelector("#lobby-sidebar button[aria-controls]"); if ((b && Object.keys(b).some((k) => k.startsWith("__reactProps"))) || Date.now() - t0 > 8000) resolve(true); else setTimeout(poll, 50); })(); })`;
  const press = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const key = async (k, vk) => { for (const type of ["rawKeyDown", "keyUp"]) await send("Input.dispatchKeyEvent", { type, key: k, code: k, windowsVirtualKeyCode: vk }); };
  const layout = `(() => { const aside = document.querySelector("#lobby-sidebar"); const a = aside.getBoundingClientRect(); const h = document.querySelector("header").getBoundingClientRect(); const m = document.querySelector("main#content").getBoundingClientRect(); const toggle = aside.querySelector("button[aria-controls]").getBoundingClientRect(); const labels = [...aside.querySelectorAll(".lobby-label")].map((l) => l.getBoundingClientRect().width); const names = [...aside.querySelectorAll("a, [data-nav-item] > button")].map((i) => (i.getAttribute("aria-label") || i.textContent).trim()); return { top: a.top, height: a.height, vh: innerHeight, width: a.width, right: a.right, header: h.left, main: m.left, toggleInside: toggle.width > 0 && toggle.bottom <= 64 && toggle.right <= a.right, hidden: labels.every((w) => w <= 1), shown: labels.every((w) => w > 1), named: names.length === 10 && names.every(Boolean), overflow: document.documentElement.scrollWidth > innerWidth }; })()`;
  await send("Page.enable");
  for (const width of [1440, 1024]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: `${base}/en` });
    await sleep(500);
    await evaluate(hydrated);
    const open = await evaluate(layout);
    check(`${width}px expanded: sidebar top 0, full height, toggle inside, header/page at its right edge`, open.top === 0 && open.height === open.vh && open.toggleInside && open.header === open.right && open.main === open.right && open.shown && !open.overflow);
    await press("#lobby-sidebar button[aria-controls]");
    await sleep(450);
    const rail = await evaluate(layout);
    check(`${width}px collapsed: rail <= 72px, labels hidden but named, header/page follow`, rail.width <= 72 && rail.top === 0 && rail.toggleInside && rail.header === rail.right && rail.main === rail.right && rail.hidden && rail.named && !rail.overflow);
  }
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send("Page.navigate", { url: `${base}/en` });
  await sleep(500);
  await evaluate(hydrated);
  const drawer = `(() => { const a = document.querySelector("#lobby-sidebar"); return { shown: getComputedStyle(a).visibility === "visible" && a.getBoundingClientRect().left === 0 && !a.inert, below: Math.round(a.getBoundingClientRect().top) === Math.round(document.querySelector("header").getBoundingClientRect().bottom) }; })()`;
  const closed = await evaluate(drawer);
  await press("header button[aria-controls]");
  await sleep(450);
  const opened = await evaluate(drawer);
  await key("Escape", 27);
  await sleep(450);
  const escaped = await evaluate(drawer);
  check("390px drawer: closed at first, opens under the header from the toggle, Esc closes it", !closed.shown && opened.shown && opened.below && !escaped.shown);
  ws.close();
}

// Page loader (components/BrandLoader.tsx): the first-load splash is in the server HTML with
// role="status", the logo from siteConfig.logo and a translated "Loading…" label.
{
  const { readFile } = await import("node:fs/promises");
  const site = await readFile(new URL("../src/config/site.ts", import.meta.url), "utf8");
  const logoSrc = site.match(/logo:\s*\{\s*src:\s*"([^"]+)"/)?.[1];
  for (const [lang, label] of Object.entries({ en: "Loading…", cn: "加载中…", de: "Wird geladen…", es: "Cargando…" })) {
    const { html } = await page(`/${lang}`);
    const loader = html.slice(html.indexOf('class="brand-loader'), html.indexOf('class="brand-loader') + 1200);
    check(
      `/${lang} page loader has role=status, the config logo (${logoSrc}) and "${label}"`,
      !!logoSrc && /^class="brand-loader[^"]*" role="status"/.test(loader) && loader.includes(`src="${logoSrc}"`) && loader.includes(label),
    );
  }
}

// Player pages (/recent, /favourites): lobby shell with the title bar and the game grid (static
// sample games), noindex, not in the sitemap.
const playerTitles = { en: ["Recent Games", "Favourites"], cn: ["最近游戏", "收藏"], de: ["Zuletzt gespielt", "Favoriten"], es: ["Juegos recientes", "Favoritos"] };
for (const [lang, titles] of Object.entries(playerTitles)) {
  for (const [i, path] of ["/recent", "/favourites"].entries()) {
    const { status, html } = await page(`/${lang}${path}`);
    const title = html.match(/<h2 id="player-games-title"[^>]*>([^<]*)</)?.[1];
    check(
      `/${lang}${path} responds 200 with "${titles[i]}", game covers, noindex`,
      status === 200 && title === titles[i] && html.includes('class="game-card') && /<meta name="robots" content="noindex, nofollow"/.test(html),
    );
  }
}
// Missions: sidebar-only "Coming soon" page (not in the top bar), in the sitemap.
for (const lang of Object.keys(comingSoon)) {
  const { status, html } = await page(`/${lang}/missions`);
  check(
    `/${lang}/missions responds 200 with "${comingSoon[lang]}", not in the top bar, no search bar`,
    status === 200 && html.includes(comingSoon[lang]) && topNavLinks(html).every((link) => !link.current && !link.href?.endsWith("/missions")) && !html.includes('id="lobby-search"'),
  );
}
check("sitemap lists /en/missions", sitemap.html.includes("/en/missions</loc>"));
check("sitemap has no /recent or /favourites", !/\/(recent|favourites)<\/loc>/.test(sitemap.html));

// Lucky Pick (categories with luckyPick: true, only slots): reel + Spin on /casino/slots only.
for (const [path, want] of [["/en/casino/slots", true], ["/de/casino/slots", true], ["/en/casino/trending-games", false], ["/en/casino/live-dealer", false], ["/en", false]]) {
  const { html } = await page(path);
  const has = html.includes('id="lucky-pick-title"') && /<button[^>]*class="lucky-spin"[^>]*>/.test(html);
  check(`${path} ${want ? "has" : "has no"} Lucky Pick${want ? " with a Spin button" : ""}`, want ? has : !html.includes("lucky-pick"));
}

// Game page (/casino/{category}/game/{id}, id = the game's id; static ids are 7-digit strings from
// config/lobby.ts#staticGameId): every tile links there; the page holds the iframe
// (TEST_GAME_URL in static mode), its control bar and the "Recommended Games" row.
// TEST_GAME_URL as written in src/config/site.ts (the static-mode iframe src of every game).
const testGameUrl = /export const TEST_GAME_URL = "([^"]+)"/.exec(readFileSync(new URL("../src/config/site.ts", import.meta.url), "utf8"))?.[1] ?? "";
const tileHref = (html, prefix) => [...html.matchAll(/<a[^>]*class="game-card[^"]*"[^>]*>/g)].map((m) => /href="([^"]+)"/.exec(m[0])?.[1]).filter((href) => href?.startsWith(prefix));
{
  const home = tileHref((await page("/en")).html, "/en/casino/trending-games/");
  const byId = (hrefs) => hrefs.length > 0 && hrefs.every((href) => /^\/en\/casino\/[a-z-]+\/game\/\d{7}$/.test(href));
  check("/en home tiles link to /en/casino/{category}/game/{id} (numeric id)", byId(home));
  const slots = tileHref((await page("/en/casino/slots")).html, "/en/casino/slots/game/");
  check("/en/casino/slots grid tiles link to /en/casino/slots/game/{id} (numeric id)", byId(slots));
  const recent = tileHref((await page("/en/recent")).html, "/en/casino/");
  check("/en/recent tiles link to game pages by id", byId(recent));
  const found = await page("/api/games/search?q=dragon");
  check("Explore search results carry an id and the category their card opens under", /"id":"\d{7}"/.test(found.html) && /"category":"(slots|live-dealer|trending-games)"/.test(found.html));
  for (const lang of ["en", "cn"]) {
    const href = slots[0]?.replace(/^\/en\//, `/${lang}/`) ?? `/${lang}/casino/slots/none`;
    const { status, html } = await page(href);
    const iframe = /<iframe[^>]*>/.exec(html)?.[0] ?? "";
    const srcOk = testGameUrl === "/demo-game.html" ? /data-src="\/demo-game\.html\?name=[^"]+"/.test(iframe) : iframe.includes(`data-src="${testGameUrl}"`);
    check(`${href} responds 200 with the game iframe (src = TEST_GAME_URL ${testGameUrl}), title = game name`, status === 200 && /<title>[^<\d]+[^<]*<\/title>/.test(html) && srcOk && /sandbox="[^"]*allow-scripts[^"]*"/.test(iframe) && ["allow-same-origin", "allow-presentation", "allow-popups"].every((token) => /sandbox="([^"]*)"/.exec(iframe)?.[1].split(" ").includes(token)) && ["autoplay", "encrypted-media", "picture-in-picture", "fullscreen"].every((feature) => /allow="([^"]*)"/.exec(iframe)?.[1].includes(feature)) && /referrerPolicy="strict-origin-when-cross-origin"|referrerpolicy="strict-origin-when-cross-origin"/.test(iframe) && / title="[^"]+"/.test(iframe));
    const buttons = [...html.matchAll(/<button[^>]*class="gp-btn[^"]*"[^>]*>/g)].map((m) => m[0]);
    check(`${href} control dock: favourite + theatre (aria-pressed), close (aria-label)`, html.includes('class="gp-dock"') && buttons.length >= 3 && buttons.filter((b) => /aria-pressed="false"/.test(b)).length >= 2 && buttons.every((b) => /aria-label="[^"]+"/.test(b)));
    check(`${href} has the side panel (info card, stat tiles) and the Recommended list with arrows`, html.includes('class="gp-side"') && /class="gp-stats"[\s\S]*?<dt>[^<]+<\/dt><dd>[^<]+<\/dd>/.test(html) && html.includes('id="gp-title"') && html.includes('id="gp-recommended"') && (html.match(/class="gp-arrow"/g) ?? []).length === 2 && /class="gp-row"[\s\S]*?<a[^>]*href="\/[a-z]+\/casino\/slots\/game\/\d{7}"[^>]*class="gp-rec-item"|class="gp-row"[\s\S]*?<a[^>]*class="gp-rec-item"[^>]*href="\/[a-z]+\/casino\/slots\/game\/\d{7}"/.test(html));
  }
  const slotsId = slots[0]?.split("/").pop() ?? "0";
  for (const path of ["/en/casino/slots/game/9999999", "/en/casino/slots/game/wild-tiger-gold", `/en/casino/live-dealer/game/${slotsId}`, `/en/casino/nope/game/${slotsId}`, "/en/casino/slots/game", `/en/casino/slots/${slotsId}`, "/en/casino/slots/wild-tiger-gold", `/en/casino/slots/game/${slotsId}/x`]) {
    check(`${path} responds 404`, (await page(path)).status === 404);
  }
  const demo = await page("/demo-game.html");
  check("/demo-game.html serves the demo game", demo.status === 200 && demo.html.includes("Click to start"));
}

const search = await page("/api/games/search?q=dragon");
check("/api/games/search?q=dragon returns games", search.status === 200 && search.html.includes("Dragon Lantern"));
const bad = await page("/api/games/search?page=0");
check("/api/games/search?page=0 is rejected (400)", bad.status === 400);

process.exit(failed ? 1 : 0);
