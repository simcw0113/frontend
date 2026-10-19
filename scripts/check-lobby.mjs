// Regression check for the lobby pages, run against a RUNNING server (no deps):
//   npm run dev   (or build && start), then:  npm run check:lobby
//   BASE_URL=http://localhost:3115 npm run check:lobby
// With no NEXT_PUBLIC_API_BASE_URL the home page must show "Top wins of the month"
// (static sample data) in every language, above the search bar, and the category
// pages must not. Home also shows "How to Register" right below Top wins and above the search
// bar (absent on category pages). Exits 1 on any failure.
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
  // The shell holds the Top wins skeleton (data-skeleton) and the content streams in later,
  // so the first skeleton marks where the section sits.
  const slot = html.indexOf("data-skeleton");
  check(`/${lang} Top wins is above the search bar`, search > -1 && slot > -1 && slot < search);
  check(`/${lang} Top wins shows amounts (MYR)`, (html.match(/MYR/g) ?? []).length >= 6);
  check(`/${lang} masks player ids`, html.includes("••••••") && !html.includes("20481937"));

  // "How to Register": 4 steps, directly below Top wins (its skeleton marks the spot in the
  // shell) and above the search bar.
  const howTo = html.indexOf('id="how-to-register-title"');
  check(`/${lang} has How to Register with 4 steps`, howTo > -1 && (html.match(/class="howto-step"/g) ?? []).length === 4);
  check(`/${lang} order: Top wins, How to Register, search bar`, slot > -1 && howTo > slot && howTo < search);
  if (lang === "en") {
    check("/en step 1 is a button, the others are plain text", (html.match(/class="howto-action"/g) ?? []).length === 1);
  }
}
for (const path of ["/en/casino/slots", "/en/casino/trending-games"]) {
  const { status, html } = await page(path);
  check(`${path} responds 200 without Top wins`, status === 200 && !html.includes('id="top-wins-heading"'));
  check(`${path} has no How to Register`, !html.includes('id="how-to-register-title"'));
}
const search = await page("/api/games/search?q=dragon");
check("/api/games/search?q=dragon returns games", search.status === 200 && search.html.includes("Dragon Lantern"));
const bad = await page("/api/games/search?page=0");
check("/api/games/search?page=0 is rejected (400)", bad.status === 400);

process.exit(failed ? 1 : 0);
