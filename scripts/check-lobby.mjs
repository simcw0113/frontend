// Regression check for the lobby pages, run against a RUNNING server (no deps):
//   npm run dev   (or build && start), then:  npm run check:lobby
//   BASE_URL=http://localhost:3115 npm run check:lobby
// With no NEXT_PUBLIC_API_BASE_URL the home page must show "Top wins of the month"
// (static sample data) in every language, below the search bar, and the category
// pages must not. Exits 1 on any failure.
const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const headings = { en: "Top wins of the month", cn: "本月最高赢奖", de: "Top-Gewinne des Monats", es: "Mayores premios del mes" };

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
  check(`/${lang} Top wins is below the search bar`, search > -1 && wins > search);
  check(`/${lang} Top wins shows amounts (MYR)`, (html.match(/MYR/g) ?? []).length >= 6);
  check(`/${lang} masks player ids`, html.includes("••••••") && !html.includes("20481937"));
}
for (const path of ["/en/casino/slots", "/en/casino/trending-games"]) {
  const { status, html } = await page(path);
  check(`${path} responds 200 without Top wins`, status === 200 && !html.includes('id="top-wins-heading"'));
}
const search = await page("/api/games/search?q=dragon");
check("/api/games/search?q=dragon returns games", search.status === 200 && search.html.includes("Dragon Lantern"));
const bad = await page("/api/games/search?page=0");
check("/api/games/search?page=0 is rejected (400)", bad.status === 400);

process.exit(failed ? 1 : 0);
