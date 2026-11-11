"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { LobbyLink } from "@/components/lobby/LobbyLink";
import { VIP_TIERS_IN_GROUP, vipGroups, vipSample, type VipGroupId, type VipRewardId } from "@/config/vip";
import { fill, htmlLang } from "@/i18n";

// VIP page (/vip), following KickWin's order: current level, progress to the next
// tier, claimable rewards, locked groups, then a short FAQ. All figures are the
// sample in config/vip.ts.

export function VipHeader() {
  const { t } = useI18n();
  return (
    <div className="promo-header">
      <h2 id="vip-title" className="text-xl font-bold">
        {t.topNav.vip}
      </h2>
      <p className="mt-1 max-w-xl text-sm text-muted">{t.vip.sample}</p>
    </div>
  );
}

export function VipClub() {
  const { locale, t } = useI18n();
  const money = (amount: number) =>
    amount.toLocaleString(htmlLang(locale), {
      style: "currency",
      currency: "MYR",
      currencyDisplay: "code",
      maximumFractionDigits: amount % 1 ? 2 : 0,
    });
  const current = vipGroups.find((group) => group.id === vipSample.groupId) ?? vipGroups[0];
  const nextTier = vipSample.tier < VIP_TIERS_IN_GROUP ? vipSample.tier + 1 : vipSample.tier;
  const progress = Math.min(100, Math.round((vipSample.wagered / current.wager) * 100));
  const remaining = Math.max(0, current.wager - vipSample.wagered);
  const levelName = (id: VipGroupId, tier?: number) =>
    tier ? fill(t.vip.levelName, { name: t.vip.levels[id], tier }) : t.vip.levels[id];
  const [claimed, setClaimed] = useState<VipRewardId[]>([]);
  const [openFaq, setOpenFaq] = useState<string | null>(t.vip.faq[0].q);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [redeemNote, setRedeemNote] = useState("");

  function claim(id: VipRewardId) {
    setClaimed((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  return (
    <div data-vip-page="" className="mt-6 space-y-6">
      <section aria-labelledby="vip-title" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center gap-4">
            <Badge color={current.color} label={t.vip.levels[current.id]} />
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">{t.vip.current}</p>
              <h3 className="mt-1 text-2xl font-bold" style={{ color: current.color }}>
                {levelName(current.id, vipSample.tier)}
              </h3>
              <Stars filled={vipSample.tier} total={VIP_TIERS_IN_GROUP} label={t.vip.tiers} />
              <p className="mt-2 text-sm text-muted">
                {t.vip.rakeback} <span className="font-semibold text-white">{current.rakeback}%</span>
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold">{t.vip.progress}</h3>
            <p className="text-sm font-bold text-brand">{progress}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={t.vip.progress}>
            <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-sm text-muted">
            {t.vip.wagered} <span className="font-semibold text-white">{money(vipSample.wagered)}</span>
            <span className="mx-1.5 text-white/25">/</span>
            {money(current.wager)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {fill(t.vip.more, { amount: money(remaining), level: levelName(current.id, nextTier) })}
          </p>
          <p className="mt-3 text-sm">
            {t.vip.nextReward} <span className="font-semibold text-brand">{money(current.reward)}</span>
          </p>
        </article>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
        <p className="text-sm">
          {t.vip.claimed} <span className="font-semibold">{money(vipSample.claimedTotal)}</span>
        </p>
        <button
          type="button"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((open) => !open)}
          className="text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {t.vip.details}
        </button>
        {detailsOpen ? (
          <ul className="w-full border-t border-white/10 pt-3 text-sm text-muted">
            {vipSample.claimed.map((line) => (
              <li key={line.id} className="flex justify-between py-1">
                <span>{t.vip.rewards[line.id]}</span>
                <span className="text-white">{money(line.amount)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setRedeemNote(t.vip.redeemUnavailable);
        }}
      >
        <label className="sr-only" htmlFor="vip-redeem">
          {t.vip.redeem}
        </label>
        <input
          id="vip-redeem"
          name="code"
          autoComplete="off"
          placeholder={t.vip.redeem}
          className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-sm outline-none placeholder:text-muted focus-visible:border-brand"
        />
        <button type="submit" className="h-11 rounded-xl bg-white/10 px-5 text-sm font-semibold hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          {t.vip.redeemSubmit}
        </button>
      </form>
      {redeemNote ? <p className="text-sm text-muted">{redeemNote}</p> : null}

      <section aria-labelledby="vip-bonus">
        <h3 id="vip-bonus" className="text-sm font-semibold tracking-wide text-muted uppercase">
          {t.vip.bonus}
        </h3>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {vipSample.rewards.map((reward) => {
            const isClaimed = claimed.includes(reward.id);
            const locked = reward.state === "locked";
            return (
              <li key={reward.id} className={`rounded-2xl border border-white/10 bg-white/[0.04] p-4 ${locked ? "opacity-60" : ""}`}>
                <p className="text-sm font-semibold">{t.vip.rewards[reward.id]}</p>
                <p className="mt-2 text-xl font-bold">{locked ? "—" : money(reward.amount)}</p>
                {locked ? (
                  <p className="mt-3 text-xs font-semibold tracking-wide text-muted uppercase">{t.vip.locked}</p>
                ) : isClaimed ? (
                  <p className="mt-3 text-xs font-semibold tracking-wide text-brand uppercase">{t.vip.claimedState}</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => claim(reward.id)}
                    className="mt-3 h-9 rounded-lg bg-brand px-4 text-xs font-extrabold tracking-wide text-lobby uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {t.vip.claim}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="vip-levels">
        <h3 id="vip-levels" className="text-sm font-semibold tracking-wide text-muted uppercase">
          {t.vip.otherLevels}
        </h3>
        <ul className="mt-3 space-y-2">
          {vipGroups.filter((group) => group.id !== current.id).map((group) => (
            <li key={group.id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <Badge color={group.color} label={t.vip.levels[group.id]} small locked />
              <div className="min-w-0 flex-1">
                <p className="font-semibold" style={{ color: group.color }}>
                  {levelName(group.id)}
                </p>
                <p className="text-xs text-muted">{fill(t.vip.levelCount, { count: VIP_TIERS_IN_GROUP })}</p>
                <p className="mt-1 text-sm text-muted">
                  {t.vip.reward} <span className="text-white">{money(group.reward)}</span>
                  <span className="mx-1.5 text-white/25">·</span>
                  {t.vip.rakeback} {group.rakeback}%
                </p>
              </div>
              <span className="text-xs font-semibold tracking-wide text-muted uppercase">{t.vip.locked}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="vip-faq">
        <h3 id="vip-faq" className="text-sm font-semibold tracking-wide text-muted uppercase">
          {t.vip.faqTitle}
        </h3>
        <div className="mt-3 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
          {t.vip.faq.map((item) => {
            const open = openFaq === item.q;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenFaq(open ? null : item.q)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                >
                  {item.q}
                  <span aria-hidden="true" className="text-muted">{open ? "–" : "+"}</span>
                </button>
                {open ? <p className="px-4 pb-4 text-sm leading-6 text-muted">{item.a}</p> : null}
              </div>
            );
          })}
        </div>
      </section>

      <LobbyLink
        href="/casino/slots"
        className="inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-extrabold tracking-wide text-lobby uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {t.vip.play}
      </LobbyLink>
    </div>
  );
}

function Badge({ color, label, small, locked }: { color: string; label: string; small?: boolean; locked?: boolean }) {
  const size = small ? "size-12 text-sm" : "size-16 text-lg";
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-black ${size} ${locked ? "opacity-70" : ""}`}
      style={{ background: `radial-gradient(circle at 35% 30%, white, ${color} 42%, #12151c 78%)`, color: "#12151c" }}
    >
      {label.slice(0, 1)}
    </span>
  );
}

function Stars({ filled, total, label }: { filled: number; total: number; label: string }) {
  return (
    <p className="mt-1 flex gap-0.5" aria-label={fill(label, { filled, total })}>
      {Array.from({ length: total }, (_, index) => (
        <svg key={index} viewBox="0 0 20 20" className={`size-3.5 ${index < filled ? "text-brand" : "text-white/20"}`} fill="currentColor" aria-hidden="true">
          <path d="m10 1.8 2.2 4.6 5 .7-3.6 3.5.9 5.1L10 13.3 5.5 15.7l.9-5.1L2.8 7.1l5-.7Z" />
        </svg>
      ))}
    </p>
  );
}
