"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { LobbyLink } from "@/components/lobby/LobbyLink";
import { missionsPoppins } from "@/components/lobby/missionsFont";
import { showToast } from "@/components/lobby/ToastHost";

// Missions page (/missions), like KickWin's Challenges: three tabs, then game cards with
// a provider tab on top and Target / Min Bet / Reward below. The card opens the game.
// Data: GET /api/missions -> backend POST /task_list (see src/app/api/missions/route.ts).

export type Mission = {
  id: number;
  title: string;
  image: string | null; // absolute URL
  can_claim: boolean;
  status: "Pending" | "Completed" | "Claimed" | "Expired" | string;
  target_label: string; // "700x", "MYR 100.00", "3 Days"
  min_bet_label: string | null;
  reward_label: string;
  provider_badge: string | null;
  game_name: string | null;
  game_image: string | null;
  game_code: string | null;
  product_public_code: string | null;
};

type Lists = { ongoing: Mission[]; finished: Mission[]; my_complete: Mission[] };
type Tab = keyof Lists;
const TABS: Tab[] = ["ongoing", "finished", "my_complete"];

// Kickwin challenge-card tier colours. We have no tier field, so these rotate by mission id.
// Red and dark-green use white badge text; the rest use #0d1b2a.
const TIER_COLORS = [
  { bg: "rgb(192, 128, 64)", text: "#0d1b2a", glow: "rgb(192 128 64 / 0.3)" },
  { bg: "rgb(255, 128, 0)", text: "#0d1b2a", glow: "rgb(255 128 0 / 0.3)" },
  { bg: "rgb(96, 192, 64)", text: "#0d1b2a", glow: "rgb(96 192 64 / 0.3)" },
  { bg: "rgb(224, 64, 64)", text: "#ffffff", glow: "rgb(224 64 64 / 0.3)" },
  { bg: "rgb(32, 192, 255)", text: "#0d1b2a", glow: "rgb(32 192 255 / 0.3)" },
  { bg: "rgb(32, 96, 0)", text: "#ffffff", glow: "rgb(32 96 0 / 0.3)" },
] as const;
const FINISHED_TIER = { bg: "#40b4e5", text: "#0d1b2a", glow: "rgb(64 180 229 / 0.3)" };

const GRID =
  "grid grid-cols-2 gap-4 min-[769px]:grid-cols-3 min-[993px]:grid-cols-4 min-[1201px]:grid-cols-5 min-[1601px]:grid-cols-6";

export function MissionsHeader() {
  const { t } = useI18n();
  // Kickwin challenge-style title band: full-bleed flat bar under the site
  // header (-mx/-mt cancels the lobby main padding). Title text stays
  // `t.menu.missions`. Art is the local Kickwin illustration at
  // /missions/missions-banner.png.
  return (
    <div className={`${missionsPoppins.className} -mx-3 -mt-4 h-[60px] overflow-hidden bg-[#223742] sm:-mx-5 md:h-[94px]`}>
      <div className="relative mx-auto h-full max-w-[1250px]">
        <h1
          id="missions-title"
          className="absolute top-1/2 left-4 -translate-y-1/2 text-[18px] font-bold text-white md:left-5 md:text-[21px]"
        >
          {t.menu.missions}
        </h1>
        {/* eslint-disable-next-line @next/next/no-img-element -- local banner asset */}
        <img
          src="/missions/missions-banner.png"
          alt=""
          className="pointer-events-none absolute top-0 right-0 h-full w-auto object-cover"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export function MissionsPage({ signedIn, ready }: { signedIn: boolean; ready: boolean }) {
  const { lang, t } = useI18n();
  const [lists, setLists] = useState<Lists | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>("ongoing");
  const [claiming, setClaiming] = useState<number | null>(null);
  const [reload, setReload] = useState(0);

  // Wait for the session so a signed-in player gets their own status on the first request.
  useEffect(() => {
    if (!ready) return;
    let live = true;
    fetch(`/api/missions?locale=${encodeURIComponent(lang)}`, { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<Lists>) : Promise.reject()))
      .then((next) => {
        if (!live) return;
        setLists(next);
        setError(false);
      })
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [ready, signedIn, lang, reload]);

  async function claim(mission: Mission) {
    setClaiming(mission.id);
    try {
      const response = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: mission.id, locale: lang }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string | null } | null;
      if (result?.ok) {
        showToast(result.message || t.missions.claimed, "success");
        setReload((n) => n + 1);
      } else {
        showToast(result?.message || t.missions.claimFailed);
      }
    } finally {
      setClaiming(null);
    }
  }

  const items = lists?.[tab] ?? [];

  return (
    <section aria-labelledby="missions-title" className={`${missionsPoppins.className} mx-auto mt-4 max-w-[1250px] min-[1024px]:mt-10`}>
      <div
        role="tablist"
        aria-label={t.menu.missions}
        className="mb-4 inline-flex gap-2 overflow-x-auto rounded-[12px] bg-[#0a1b28] p-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[768px]:flex max-[768px]:w-full max-[768px]:bg-[#04141e] max-[768px]:p-[6px]"
      >
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-lg border-0 px-6 py-3 text-sm font-semibold whitespace-nowrap transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand max-[768px]:flex-1 max-[768px]:px-4 max-[768px]:py-3 max-[768px]:text-center ${
              tab === id
                ? "bg-[#223742] text-white"
                : "bg-transparent text-[#ffffff99] hover:bg-[#ffffff0d] hover:text-white max-[768px]:text-[#6b8a94] max-[768px]:hover:bg-[#8fa5a81a] max-[768px]:hover:text-[#8fa5a8]"
            }`}
          >
            {t.missions.tabs[id]}
          </button>
        ))}
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-sm text-[#ffffff80]">
            {t.missions.error}{" "}
            <button type="button" onClick={() => setReload((n) => n + 1)} className="font-semibold text-brand hover:underline">
              {t.missions.retry}
            </button>
          </p>
        </div>
      ) : !lists ? (
        <MissionsLoading />
      ) : items.length === 0 ? (
        <MissionsEmpty />
      ) : (
        <ul className={GRID}>
          {items.map((mission) => (
            <li key={mission.id}>
              <MissionCard
                mission={mission}
                finished={tab === "finished"}
                claiming={claiming === mission.id}
                onClaim={() => void claim(mission)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MissionCard({
  mission,
  finished,
  claiming,
  onClaim,
}: {
  mission: Mission;
  finished: boolean;
  claiming: boolean;
  onClaim: () => void;
}) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  const art = mission.game_image || mission.image;
  const name = mission.game_name || mission.title;
  const href =
    mission.product_public_code && mission.game_code
      ? `/casino/all-games/provider/${encodeURIComponent(mission.product_public_code)}/game/${encodeURIComponent(mission.game_code)}`
      : null;
  const badge = mission.provider_badge;
  const tier = finished ? FINISHED_TIER : TIER_COLORS[Math.abs(mission.id) % TIER_COLORS.length];

  const cover = (
    <div className="relative aspect-[3/4] w-full min-w-full max-h-[320px] shrink-0 overflow-hidden rounded-[10px]">
      {art && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- images come from the API, any host
        <img
          ref={(img) => {
            if (img && img.complete && img.naturalWidth === 0) setFailed(true);
          }}
          src={art}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 block h-full w-full rounded-[10px] object-cover object-center transition duration-200 group-hover:shadow-[0_0_20px_var(--tier-glow)]"
          style={{ objectFit: "cover" }}
        />
      ) : (
        <p className="absolute inset-0 grid place-items-center p-3 text-center text-lg font-black">{name}</p>
      )}
      {badge ? (
        <span
          className="absolute top-[-2px] left-1/2 z-10 max-w-[90%] -translate-x-1/2 truncate rounded-b-lg px-3 py-1 text-[11px] font-bold tracking-[0.5px] whitespace-nowrap uppercase"
          style={{ backgroundColor: tier.bg, color: tier.text }}
        >
          {badge}
        </span>
      ) : null}
    </div>
  );

  const rows = (
    <div className="flex flex-col gap-[0.8rem] p-4 pb-[1.1rem]">
      <dl className="flex flex-col gap-2">
        <div className="flex flex-col gap-[0.3rem] pb-2">
          <Row label={t.missions.target} value={mission.target_label} />
          <Row label={t.missions.minBet} value={mission.min_bet_label || "—"} />
          <Row label={t.missions.reward} value={mission.reward_label} />
        </div>
      </dl>
    </div>
  );

  const body = href ? (
    <LobbyLink
      href={href}
      className="flex min-h-0 flex-1 flex-col focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
    >
      {cover}
      {rows}
    </LobbyLink>
  ) : (
    <>
      {cover}
      {rows}
    </>
  );

  return (
    <article
      style={{ "--tier-glow": tier.glow } as React.CSSProperties}
      className={`group flex h-full cursor-pointer flex-col overflow-hidden rounded-[10px] bg-[#0a1b28] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_#0003] ${
        finished ? "opacity-70" : ""
      }`}
    >
      {body}
      {mission.can_claim ? (
        <button
          type="button"
          onClick={onClaim}
          disabled={claiming}
          className="mx-4 mb-[1.1rem] rounded-lg bg-brand py-2 text-sm font-extrabold text-lobby disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {t.missions.claim}
        </button>
      ) : mission.status === "Claimed" ? (
        <p className="mx-4 mb-[1.1rem] rounded-lg bg-white/5 py-2 text-center text-sm font-semibold text-muted">{t.missions.claimed}</p>
      ) : null}
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[12px] leading-normal whitespace-nowrap text-[#ffffff99]">{label}</dt>
      <dd className="truncate text-[13px] leading-normal whitespace-nowrap text-white">{value}</dd>
    </div>
  );
}

function MissionsEmpty() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- local empty-state asset */}
      <img src="/missions/missions-empty.png" alt="" width={120} height={140} className="h-[140px] w-[120px] opacity-50" />
      <p className="text-sm text-[#ffffff80]">{t.missions.empty}</p>
    </div>
  );
}

function MissionsLoading() {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center py-16" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t.loading}</span>
      <span className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
    </div>
  );
}
