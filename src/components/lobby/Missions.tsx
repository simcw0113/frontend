"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { LobbyLink } from "@/components/lobby/LobbyLink";
import { showToast } from "@/components/lobby/ToastHost";
import { fill, htmlLang } from "@/i18n";

// Missions page (/missions), laid out like KickWin's Challenges: tabs, then a grid of
// cards (game art, target, reward, progress, time left, Play / Claim).
// Data: GET /api/missions -> backend POST /task_list (see src/app/api/missions/route.ts).

export type Mission = {
  id: number;
  title: string;
  description: string | null; // plain text (route strips the HTML)
  terms: string | null;
  image: string | null; // absolute URL
  type: "Daily" | "Weekly" | "Monthly" | "Yearly" | string;
  condition: "Login" | "Deposit" | "Turnover" | "Winover" | string;
  target: number;
  progress: number;
  progress_percentage: number;
  status: "Pending" | "Completed" | "Claimed" | "Expired" | string;
  can_claim: boolean;
  cycle_end: string; // "Y-m-d H:i:s", server time
  currency: string;
  target_label: string;
  min_bet_label: string | null;
  winover_multiplier: number;
  reward_label: string;
  provider_badge: string | null;
  game_name: string | null;
  game_image: string | null;
  game_code: string | null;
  product_public_code: string | null;
};

type Lists = { ongoing: Mission[]; my_complete: Mission[]; finished: Mission[] };
type Tab = keyof Lists;
const TABS: Tab[] = ["ongoing", "my_complete", "finished"];

export function MissionsHeader() {
  const { t } = useI18n();
  return (
    <div className="promo-header">
      <h2 id="missions-title" className="text-xl font-bold">
        {t.menu.missions}
      </h2>
      <p className="mt-1 max-w-xl text-sm text-muted">{t.missions.subtitle}</p>
    </div>
  );
}

export function MissionsPage({ signedIn, ready, onSignIn }: { signedIn: boolean; ready: boolean; onSignIn: () => void }) {
  const { lang, locale, t } = useI18n();
  const [lists, setLists] = useState<Lists | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>("ongoing");
  const [claiming, setClaiming] = useState<number | null>(null);

  const [reload, setReload] = useState(0);

  // Wait for the session so a signed-in player gets their progress on the first request.
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
  const tabs = signedIn ? TABS : TABS.filter((id) => id !== "my_complete");

  return (
    <section aria-labelledby="missions-title" className="mt-6">
      <div role="tablist" aria-label={t.menu.missions} className="flex gap-2 overflow-x-auto">
        {tabs.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              tab === id ? "bg-brand text-lobby" : "bg-white/5 text-muted hover:bg-white/10 hover:text-white"
            }`}
          >
            {t.missions.tabs[id]}
            {lists ? <span className="ml-1.5 opacity-70">{lists[id].length}</span> : null}
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
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((mission) => (
              <li key={mission.id}>
                <MissionCard
                  mission={mission}
                  signedIn={signedIn}
                  finished={tab === "finished"}
                  claiming={claiming === mission.id}
                  onClaim={() => void claim(mission)}
                  onSignIn={onSignIn}
                  numberLocale={htmlLang(locale)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function MissionCard({
  mission,
  signedIn,
  finished,
  claiming,
  onClaim,
  onSignIn,
  numberLocale,
}: {
  mission: Mission;
  signedIn: boolean;
  finished: boolean;
  claiming: boolean;
  onClaim: () => void;
  onSignIn: () => void;
  numberLocale: string;
}) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  const art = mission.game_image || mission.image;
  const percent = Math.max(0, Math.min(100, Math.round(mission.progress_percentage)));
  const claimed = mission.status === "Claimed";
  const done = claimed || mission.status === "Completed";
  const playHref =
    mission.product_public_code && mission.game_code
      ? `/casino/all-games/provider/${encodeURIComponent(mission.product_public_code)}/game/${encodeURIComponent(mission.game_code)}`
      : null;
  const cycle = t.missions.cycle[mission.type as keyof typeof t.missions.cycle] ?? mission.type;

  const count = (n: number) => n.toLocaleString(numberLocale, { maximumFractionDigits: 2 });
  const money = (n: number) => `${mission.currency} ${n.toLocaleString(numberLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const goal =
    mission.condition === "Login"
      ? fill(t.missions.goal.Login, { n: count(mission.target) })
      : mission.condition === "Winover"
        ? fill(t.missions.goal.Winover, { x: count(mission.winover_multiplier), n: count(mission.target) })
        : fill(mission.condition === "Deposit" ? t.missions.goal.Deposit : t.missions.goal.Turnover, { amount: mission.target_label });
  const progressText =
    mission.condition === "Deposit" || mission.condition === "Turnover"
      ? `${money(mission.progress)} / ${money(mission.target)}`
      : `${count(mission.progress)} / ${count(mission.target)}`;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      <div className="relative aspect-[16/9] bg-gradient-to-br from-brand/25 via-lobby-soft to-lobby">
        {art && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element -- images come from the API, any host
          <img
            ref={(img) => {
              if (img && img.complete && img.naturalWidth === 0) setFailed(true);
            }}
            src={art}
            alt=""
            width={640}
            height={360}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <p aria-hidden="true" className="absolute inset-0 grid place-items-center text-4xl font-black text-brand/60">
            {mission.condition === "Winover" ? `${count(mission.winover_multiplier)}x` : mission.target_label}
          </p>
        )}
        <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold backdrop-blur">{cycle}</span>
        {done ? (
          <span className="absolute top-2 right-2 rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-lobby">
            {claimed ? t.missions.claimed : t.missions.completed}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-bold">{mission.title}</h3>
          {mission.game_name || mission.provider_badge ? (
            <p className="mt-0.5 text-xs text-muted">{[mission.game_name, mission.provider_badge].filter(Boolean).join(" · ")}</p>
          ) : null}
          {mission.description ? <p className="mt-2 line-clamp-2 text-sm text-muted">{mission.description}</p> : null}
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <dt className="text-xs text-muted">{t.missions.target}</dt>
            <dd className="mt-0.5 font-semibold">{goal}</dd>
            {mission.min_bet_label ? (
              <dd className="mt-0.5 text-xs text-muted">{fill(t.missions.minBet, { amount: mission.min_bet_label })}</dd>
            ) : null}
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <dt className="text-xs text-muted">{t.missions.reward}</dt>
            <dd className="mt-0.5 font-bold text-brand">{mission.reward_label}</dd>
          </div>
        </dl>

        {signedIn ? (
          <div>
            <div className="flex justify-between text-xs text-muted">
              <span>{t.missions.progress}</span>
              <span className="text-white">{progressText}</span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-label={t.missions.progress}
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
            </div>
          </div>
        ) : null}

        {mission.terms ? (
          <details className="text-xs text-muted">
            <summary className="cursor-pointer font-semibold hover:text-white">{t.missions.terms}</summary>
            <p className="mt-1.5">{mission.terms}</p>
          </details>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-muted">{finished ? t.missions.ended : <TimeLeft end={mission.cycle_end} />}</p>
          {!signedIn ? (
            <ActionButton onClick={onSignIn}>{t.missions.signIn}</ActionButton>
          ) : mission.can_claim ? (
            <ActionButton onClick={onClaim} disabled={claiming}>
              {t.missions.claim}
            </ActionButton>
          ) : claimed || finished ? null : playHref ? (
            <LobbyLink
              href={playHref}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {t.missions.play}
            </LobbyLink>
          ) : null}
        </div>
      </div>
    </article>
  );
}

// shortcut: cycle_end is server time read as the viewer's local time; fine while players share the server's timezone, send an ISO offset from /task_list when they don't.
function TimeLeft({ end }: { end: string }) {
  const { t } = useI18n();
  // Cards render only after the client fetch, so reading the clock here cannot mismatch SSR.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const endAt = new Date(end.replace(" ", "T")).getTime();
  if (Number.isNaN(endAt)) return null;
  const minutes = Math.max(0, Math.floor((endAt - now) / 60_000));
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  return <>{fill(t.missions.timeLeft, { time: d > 0 ? `${d}d ${h}h` : `${h}h ${m}m` })}</>;
}

function ActionButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg bg-brand px-4 py-2 text-sm font-extrabold text-lobby disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {children}
    </button>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-muted">{children}</p>;
}

function MissionsSkeleton() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true" data-skeleton="">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
          <div className="aspect-[16/9] bg-white/5 motion-safe:animate-pulse" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/5 rounded bg-white/10" />
            <div className="h-14 rounded-xl bg-white/5" />
            <div className="h-2 rounded-full bg-white/10" />
          </div>
        </li>
      ))}
    </ul>
  );
}
