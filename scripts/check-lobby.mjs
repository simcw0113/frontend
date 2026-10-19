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
  const logo = header.indexOf('src="/brand/logo.png"');
  check(
    `/${lang} sidebar toggle is a labelled button with aria-expanded and aria-controls=lobby-sidebar`,
    header.includes('aria-controls="lobby-sidebar"') && html.includes('id="lobby-sidebar"'),
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
  check(`/${lang} sidebar has Promotions right below Home`, homeLink > -1 && promoLink > homeLink && !aside.slice(homeLink, promoLink).includes("<button"));
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

// Top bar links (config/topNav.ts): 5 links in this order inside the header, the shown page's
// link marked aria-current="page". Live Dealer is its own page but no home row; Sports and VIP
// are "Coming soon" placeholders.
const topNavPaths = ["/casino/slots", "/casino/live-dealer", "/sports", "/promotions", "/vip"];
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
    `/${lang} top bar has 5 links in order (Slots, Live Dealer, Sports, Promotions, VIP), none current on home`,
    links.length === 5 && links.every((link, i) => link.href === `/${lang}${topNavPaths[i]}` && !link.current),
  );
  for (const path of ["/sports", "/vip"]) {
    const { status, html } = await page(`/${lang}${path}`);
    const current = topNavLinks(html).filter((link) => link.current).map((link) => link.href);
    check(
      `/${lang}${path} responds 200 with "${comingSoon[lang]}", its top link current, no search bar`,
      status === 200 && html.includes(comingSoon[lang]) && current.join() === `/${lang}${path}` && !html.includes('id="lobby-search"'),
    );
  }
}
for (const path of ["/en/casino/slots", "/en/promotions", "/en/casino/live-dealer"]) {
  const current = topNavLinks((await page(path)).html).filter((link) => link.current).map((link) => link.href);
  check(`${path} marks only its own top link as current`, current.join() === path);
}
{
  const live = await page("/en/casino/live-dealer");
  check("/en/casino/live-dealer responds 200 with Live Dealer games", live.status === 200 && live.html.includes("Live Dealer") && live.html.includes("Lightning Roulette"));
  const home = await page("/en");
  const body = home.html.slice(home.html.indexOf("</header>"));
  check("/en home has no Live Dealer row", !body.includes('href="/en/casino/live-dealer"') && !body.includes("Lightning Roulette"));
  check("sitemap lists /en/casino/live-dealer, /en/sports and /en/vip", ["/en/casino/live-dealer", "/en/sports", "/en/vip"].every((path) => sitemap.html.includes(`${path}</loc>`)));
}
for (const path of ["/en/casino/nope", "/en/sport", "/en/vip/nope"]) {
  const { status } = await page(path);
  check(`${path} is 404`, status === 404);
}

const search = await page("/api/games/search?q=dragon");
check("/api/games/search?q=dragon returns games", search.status === 200 && search.html.includes("Dragon Lantern"));
const bad = await page("/api/games/search?page=0");
check("/api/games/search?page=0 is rejected (400)", bad.status === 400);

process.exit(failed ? 1 : 0);
