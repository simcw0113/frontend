"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { affiliateConfig, type AffiliateTierId } from "@/config/affiliate";
import { siteConfig } from "@/config/site";
import { fill } from "@/i18n";
import { localizedPath } from "@/i18n/routing";

// Static affiliate programme page (/{lang}/affiliate). Figures come from
// config/affiliate.ts (placeholders). The referral-link block is shown only
// when the signed-in session already carries a referral code.

export function AffiliateHeader() {
  const { t } = useI18n();
  return (
    <div className="promo-header">
      <h2 id="affiliate-title" className="text-xl font-bold">
        {t.affiliate.title}
      </h2>
      <span className="promo-header-art grid place-items-center [&>svg]:size-full">
        <AffiliateMark />
      </span>
    </div>
  );
}

export function AffiliatePage({
  signedIn,
  referralCode,
  onJoin,
  onSignIn,
}: {
  signedIn: boolean;
  referralCode?: string | null;
  onJoin: () => void;
  onSignIn: () => void;
}) {
  const { t, lang } = useI18n();
  const [openFaq, setOpenFaq] = useState<string | null>(t.affiliate.faq[0]?.q ?? null);
  const [copied, setCopied] = useState(false);
  const referralUrl =
    referralCode && signedIn
      ? `${siteConfig.url}${localizedPath(lang, "/")}?ref=${encodeURIComponent(referralCode)}`
      : null;

  async function copyLink() {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-8">
      <section
        aria-labelledby="affiliate-hero-title"
        className="grid gap-6 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1.2fr)_auto] lg:items-center"
      >
        <div>
          <h3 id="affiliate-hero-title" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {t.affiliate.heroTitle}
          </h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">{t.affiliate.heroBody}</p>
        </div>
        {signedIn ? null : (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={onJoin} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-lobby">
              {t.affiliate.join}
            </button>
            <button type="button" onClick={onSignIn} className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
              {t.auth.signIn}
            </button>
          </div>
        )}
      </section>

      {referralUrl ? (
        <section aria-labelledby="affiliate-referral-title" className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-5">
          <h3 id="affiliate-referral-title" className="text-sm font-semibold tracking-wide text-muted uppercase">
            {t.affiliate.referralTitle}
          </h3>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-lobby px-3 py-2 text-sm text-white">
              {referralUrl}
            </code>
            <button type="button" onClick={() => void copyLink()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-lobby">
              {copied ? t.affiliate.referralCopied : t.affiliate.referralCopy}
            </button>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="affiliate-how">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 id="affiliate-how" className="text-sm font-semibold tracking-wide text-muted uppercase">
            {t.affiliate.howTitle}
          </h3>
          <p className="text-sm text-muted">
            {fill(t.affiliate.rateLabel, { rate: affiliateConfig.commissionRate })}
          </p>
        </div>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {t.affiliate.steps.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-5">
              <p className="text-xs font-semibold tracking-wide text-brand uppercase">
                {fill(t.affiliate.stepLabel, { n: index + 1 })}
              </p>
              <h4 className="mt-2 text-base font-semibold text-white">{step.title}</h4>
              <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="affiliate-tiers">
        <h3 id="affiliate-tiers" className="text-sm font-semibold tracking-wide text-muted uppercase">
          {t.affiliate.tiersTitle}
        </h3>
        <p className="mt-2 max-w-2xl text-sm text-muted">{t.affiliate.tiersNote}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {affiliateConfig.tiers.map((tier) => (
            <article key={tier.id} className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-5">
              <h4 className="text-base font-semibold text-white">{t.affiliate.tierNames[tier.id as AffiliateTierId]}</h4>
              <p className="mt-3 text-3xl font-bold text-brand">{fill(t.affiliate.tierRate, { rate: tier.rate })}</p>
              <p className="mt-2 text-sm text-muted">
                {tier.minActive === 0 ? t.affiliate.tierDefault : fill(t.affiliate.tierActive, { count: tier.minActive })}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="affiliate-faq">
        <h3 id="affiliate-faq" className="text-sm font-semibold tracking-wide text-muted uppercase">
          {t.affiliate.faqTitle}
        </h3>
        <div className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10">
          {t.affiliate.faq.map((item) => {
            const open = openFaq === item.q;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenFaq(open ? null : item.q)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-white hover:bg-white/5"
                >
                  {item.q}
                  <span aria-hidden="true" className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}>
                    ▾
                  </span>
                </button>
                {open ? <p className="px-5 pb-4 text-sm leading-6 text-muted">{item.a}</p> : null}
              </div>
            );
          })}
        </div>
      </section>

      {signedIn ? null : (
        <section className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">{t.affiliate.ctaTitle}</h3>
            <p className="mt-1 text-sm text-muted">{t.affiliate.ctaBody}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onJoin} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-lobby">
              {t.affiliate.join}
            </button>
            <button type="button" onClick={onSignIn} className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
              {t.auth.signIn}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function AffiliateMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7.5" cy="8" r="2.5" />
      <circle cx="16.5" cy="8" r="2.5" />
      <path d="M3.5 18 C3.8 14.8 5.4 13 7.5 13 C9.6 13 11.2 14.8 11.5 18" />
      <path d="M12.5 18 C12.8 14.8 14.4 13 16.5 13 C18.6 13 20.2 14.8 20.5 18" />
    </svg>
  );
}
