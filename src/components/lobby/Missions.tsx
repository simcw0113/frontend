"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { LobbyLink } from "@/components/lobby/LobbyLink";
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
// Provider tab colours, picked by provider name so a provider keeps its colour.
const BADGE_COLORS = ["#c07a2c", "#f07c00", "#4fc232", "#e23a4b", "#1e3a5f", "#7c3aed"];

export function MissionsHeader() {
  const { t } = useI18n();
  return (
    // KickWin-style banner: plain title on a lighter panel with a darker strip below, no border.
    <div className="overflow-hidden rounded-2xl bg-white/[0.03] pb-6">
      <div className="bg-white/[0.05] px-6 py-10 sm:px-8 sm:py-12">
        <h2 id="missions-title" className="text-2xl font-bold sm:text-3xl">
          {t.menu.missions}
        </h2>
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
    <section aria-labelledby="missions-title" className="mt-6">
      <div role="tablist" aria-label={t.menu.missions} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-black/30 p-1.5">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              tab === id ? "bg-white/10 text-white" : "text-muted hover:text-white"
            }`}
          >
            {t.missions.tabs[id]}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {error ? (
          <Notice>
            {t.missions.error}{" "}
            <button type="button" onClick={() => setReload((n) => n + 1)} className="font-semibold text-brand hover:underline">
              {t.missions.retry}
            </button>
          </Notice>
        ) : !lists ? (
          <MissionsSkeleton />
        ) : items.length === 0 ? (
          <Notice>{t.missions.empty}</Notice>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((mission) => (
              <li key={mission.id}>
                <MissionCard mission={mission} claiming={claiming === mission.id} onClaim={() => void claim(mission)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function MissionCard({ mission, claiming, onClaim }: { mission: Mission; claiming: boolean; onClaim: () => void }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  const art = mission.game_image || mission.image;
  const name = mission.game_name || mission.title;
  const href =
    mission.product_public_code && mission.game_code
      ? `/casino/all-games/provider/${encodeURIComponent(mission.product_public_code)}/game/${encodeURIComponent(mission.game_code)}`
      : null;
  const badge = mission.provider_badge;
  const badgeColor = badge ? BADGE_COLORS[[...badge].reduce((sum, c) => sum + c.charCodeAt(0), 0) % BADGE_COLORS.length] : "";

  const cover = (
    <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-brand/25 via-lobby-soft to-lobby">
      {art && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- images come from the API, any host
        <img
          ref={(img) => {
            if (img && img.complete && img.naturalWidth === 0) setFailed(true);
          }}
          src={art}
          alt={name}
          width={330}
          height={440}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <p className="absolute inset-0 grid place-items-center p-3 text-center text-lg font-black">{name}</p>
      )}
      {badge ? (
        <span
          className="absolute top-0 left-1/2 max-w-[85%] -translate-x-1/2 truncate rounded-b-lg px-3 py-1 text-[11px] font-extrabold tracking-wide text-white uppercase"
          style={{ backgroundColor: badgeColor }}
        >
          {badge}
        </span>
      ) : null}
    </div>
  );

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-black/30 pb-4">
      {href ? (
        <LobbyLink href={href} className="block focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand">
          {cover}
        </LobbyLink>
      ) : (
        cover
      )}
      <dl className="mt-4 space-y-1.5 px-4 text-sm">
        <Row label={t.missions.target} value={mission.target_label} />
        {mission.min_bet_label ? <Row label={t.missions.minBet} value={mission.min_bet_label} /> : null}
        <Row label={t.missions.reward} value={mission.reward_label} />
      </dl>
      {mission.can_claim ? (
        <button
          type="button"
          onClick={onClaim}
          disabled={claiming}
          className="mx-4 mt-3 rounded-lg bg-brand py-2 text-sm font-extrabold text-lobby disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {t.missions.claim}
        </button>
      ) : mission.status === "Claimed" ? (
        <p className="mx-4 mt-3 rounded-lg bg-white/5 py-2 text-center text-sm font-semibold text-muted">{t.missions.claimed}</p>
      ) : null}
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-muted">{children}</p>;
}

function MissionsSkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5" aria-hidden="true" data-skeleton="">
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="overflow-hidden rounded-2xl bg-black/30 pb-4">
          <div className="aspect-[3/4] bg-white/5 motion-safe:animate-pulse" />
          <div className="mt-4 space-y-2 px-4">
            <div className="h-3.5 rounded bg-white/10" />
            <div className="h-3.5 rounded bg-white/10" />
            <div className="h-3.5 rounded bg-white/10" />
          </div>
        </li>
      ))}
    </ul>
  );
}
