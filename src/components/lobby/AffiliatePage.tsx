"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { showToast } from "@/components/lobby/ToastHost";
import { missionsPoppins } from "@/components/lobby/missionsFont";
import { affiliateConfig } from "@/config/affiliate";
import { siteConfig } from "@/config/site";
import { fill } from "@/i18n";
import { localizedPath } from "@/i18n/routing";

// Affiliate page (/{lang}/affiliate), restyled to follow Kickwin's /referral layout.
// Live data is still only the signed-in referral code; stats/campaigns/earnings are placeholders.

type MemberTab = "overview" | "referred-users" | "campaigns" | "earnings";
const MEMBER_TABS: MemberTab[] = ["overview", "referred-users", "campaigns", "earnings"];
const TAB_I18N: Record<MemberTab, "overview" | "referredUsers" | "campaigns" | "earnings"> = {
  overview: "overview",
  "referred-users": "referredUsers",
  campaigns: "campaigns",
  earnings: "earnings",
};

export function AffiliateHeader() {
  const { t } = useI18n();
  return (
    <div className={`${missionsPoppins.className} -mx-3 -mt-4 h-[60px] overflow-hidden bg-[#223742] sm:-mx-5 min-[1101px]:h-[94px]`}>
      <div className="relative mx-auto h-full max-w-[1250px]">
        <h1
          id="affiliate-title"
          className="absolute top-1/2 left-4 z-[1] -translate-y-1/2 text-[18px] font-bold text-white md:left-5 md:text-[21px]"
        >
          {t.affiliate.title}
        </h1>
        {/* eslint-disable-next-line @next/next/no-img-element -- local banner asset */}
        <img
          src="/affiliate/refer-header.png"
          alt=""
          className="pointer-events-none absolute top-0 right-20 z-[5] h-full w-auto scale-150 object-cover max-[768px]:right-10"
          aria-hidden="true"
        />
      </div>
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
  const [tab, setTab] = useState<MemberTab>("overview");
  const [qrOpen, setQrOpen] = useState(false);
  const referralUrl =
    referralCode && signedIn
      ? `${siteConfig.url}${localizedPath(lang, "/")}?ref=${encodeURIComponent(referralCode)}`
      : null;
  const rate = affiliateConfig.commissionRate;
  const formula = fill(t.affiliate.commissionFormula, { rate });

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

  function shareTelegram() {
    if (!referralUrl) return;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}`, "_blank", "noopener,noreferrer");
  }

  function showContact() {
    showToast(t.affiliate.contactSoon);
  }

  function goFaq() {
    document.getElementById("affiliate-faq")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className={`${missionsPoppins.className} mx-auto w-full max-w-[1250px] text-white ${signedIn ? "px-4 min-[1024px]:mt-10" : "mt-6 px-4 min-[1024px]:mt-10"} max-[768px]:px-4`}>
      {signedIn ? (
        <MemberView
          tab={tab}
          setTab={setTab}
          referralUrl={referralUrl}
          copied={copied}
          onCopy={() => void copyLink()}
          onQr={() => setQrOpen(true)}
          onTelegram={shareTelegram}
          onTerms={goFaq}
          onContact={showContact}
          onViewCampaigns={() => setTab("campaigns")}
          rate={rate}
          formula={formula}
        />
      ) : (
        <GuestView onJoin={onJoin} onSignIn={onSignIn} onTerms={goFaq} onContact={showContact} rate={rate} formula={formula} />
      )}

      <FaqPanel openFaq={openFaq} setOpenFaq={setOpenFaq} />

      {qrOpen ? <QrDialog url={referralUrl} copied={copied} onCopy={() => void copyLink()} onClose={() => setQrOpen(false)} /> : null}
    </div>
  );
}

function GuestView({
  onJoin,
  onSignIn,
  onTerms,
  onContact,
  rate,
  formula,
}: {
  onJoin: () => void;
  onSignIn: () => void;
  onTerms: () => void;
  onContact: () => void;
  rate: number;
  formula: string;
}) {
  const { t } = useI18n();
  return (
    <div>
      <div className="mt-8 grid grid-cols-1 items-center gap-2 max-[900px]:gap-2 min-[901px]:mt-[68px] min-[901px]:grid-cols-[minmax(0,40%)_minmax(0,60%)] min-[901px]:gap-6">
        <div className="relative z-[2] w-full py-2 max-[900px]:order-2 max-[900px]:flex max-[900px]:flex-col max-[900px]:items-center max-[900px]:text-center">
          <h2 className="m-0 mb-3 text-[21px] leading-[31.5px] font-bold tracking-normal text-white uppercase min-[901px]:mb-3 min-[901px]:text-[36px] min-[901px]:leading-[54px]">
            {t.affiliate.heroPrefix1} <span className="text-brand">{t.affiliate.heroHighlight1}</span>
            <br className="max-[900px]:hidden" /> {t.affiliate.heroPrefix2} <span className="text-brand">{t.affiliate.heroHighlight2}</span>
            <br className="max-[900px]:hidden" /> {t.affiliate.heroSuffix}
          </h2>
          <p className="mb-8 max-w-[420px] text-[12px] leading-[18px] font-medium text-[#9baab2] max-[900px]:w-full max-[900px]:max-w-none min-[901px]:mb-9 min-[901px]:text-sm min-[901px]:leading-[21px]">
            {t.affiliate.heroDescription}{" "}
            <button type="button" onClick={onTerms} className="inline border-0 bg-transparent p-0 font-semibold text-white underline">
              {t.affiliate.termsAndConditions}
            </button>
          </p>
          <div className="flex flex-wrap items-center gap-3 max-[900px]:justify-center">
            <PrimaryButton onClick={onJoin}>{t.affiliate.joinProgram}</PrimaryButton>
            <button type="button" onClick={onSignIn} className="rounded-lg px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">
              {t.auth.signIn}
            </button>
          </div>
        </div>
        <div className="relative flex items-center justify-end overflow-visible max-[900px]:order-1 max-[900px]:w-full max-[900px]:justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- local hero art */}
          <img src="/affiliate/hero.png" alt="" className="block h-auto w-full max-w-[692px] object-contain" />
        </div>
      </div>
      <FeatureGrid />
      <HowToStart rate={rate} cta={t.affiliate.joinProgram} onCta={onJoin} />
      <CommissionPanel formula={formula} />
      <MoreInfo onContact={onContact} />
    </div>
  );
}

function MemberView({
  tab,
  setTab,
  referralUrl,
  copied,
  onCopy,
  onQr,
  onTelegram,
  onTerms,
  onContact,
  onViewCampaigns,
  rate,
  formula,
}: {
  tab: MemberTab;
  setTab: (tab: MemberTab) => void;
  referralUrl: string | null;
  copied: boolean;
  onCopy: () => void;
  onQr: () => void;
  onTelegram: () => void;
  onTerms: () => void;
  onContact: () => void;
  onViewCampaigns: () => void;
  rate: number;
  formula: string;
}) {
  const { t } = useI18n();
  return (
    <div>
      <nav aria-label={t.affiliate.title} className="mb-4">
        <div className="inline-flex max-w-full min-h-[51px] flex-wrap items-center overflow-x-auto rounded-[10px] bg-[#0a1b28] p-[5px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MEMBER_TABS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex h-[42px] items-center justify-center rounded-lg border-0 px-2.5 text-xs leading-[18px] font-semibold whitespace-nowrap transition-all duration-200 min-[769px]:px-3 min-[769px]:text-base min-[769px]:leading-6 ${
                tab === id ? "bg-[#22333f] text-white" : "bg-transparent text-[#9baab2] hover:text-white"
              }`}
            >
              {t.affiliate.tabs[TAB_I18N[id]]}
            </button>
          ))}
        </div>
      </nav>

      {tab === "overview" ? (
        <>
          <div className="mt-8 grid grid-cols-1 items-center gap-2 min-[901px]:mt-[68px] min-[901px]:grid-cols-[minmax(0,40%)_minmax(0,60%)] min-[901px]:gap-6">
            <div className="relative z-[2] w-full py-2 max-[900px]:order-2 max-[900px]:flex max-[900px]:flex-col max-[900px]:items-center max-[900px]:text-center">
              <h2 className="m-0 mb-3 text-[21px] leading-[31.5px] font-bold text-white uppercase min-[901px]:text-[36px] min-[901px]:leading-[54px]">
                <span className="text-brand">{t.affiliate.shareHighlight}</span> {t.affiliate.shareSuffix}
              </h2>
              <p className="mb-8 max-w-[420px] text-[12px] leading-[18px] font-medium text-[#9baab2] max-[900px]:w-full max-[900px]:max-w-none min-[901px]:mb-9 min-[901px]:text-sm min-[901px]:leading-[21px]">
                {t.affiliate.shareDescription}{" "}
                <button type="button" onClick={onTerms} className="inline border-0 bg-transparent p-0 font-semibold text-white underline">
                  {t.affiliate.termsAndConditions}
                </button>
              </p>
              <MemberLinkRow url={referralUrl} copied={copied} onCopy={onCopy} onQr={onQr} onTelegram={onTelegram} />
            </div>
            <div className="relative flex items-center justify-end overflow-visible max-[900px]:order-1 max-[900px]:w-full max-[900px]:justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- local hero art */}
              <img src="/affiliate/hero.png" alt="" className="block h-auto w-full max-w-[692px] object-contain" />
            </div>
          </div>

          <div className="my-7 grid w-full grid-cols-1 gap-2.5 min-[769px]:grid-cols-3 min-[769px]:gap-4">
            <StatCard icon="/affiliate/icon-signups.svg" label={t.affiliate.lifetimeSignups} value={`— ${t.affiliate.users}`} />
            <StatCard icon="/affiliate/icon-wagered.svg" label={t.affiliate.totalWagered} value="—" />
            <StatCard icon="/affiliate/icon-earnings.svg" label={t.affiliate.referralEarnings} value="—" />
          </div>

          <HowToStart rate={rate} cta={t.affiliate.viewCampaigns} onCta={onViewCampaigns} />
          <CommissionPanel formula={formula} />
          <MoreInfo onContact={onContact} />
        </>
      ) : (
        <EmptyPanel>
          {tab === "campaigns" ? t.affiliate.emptyCampaigns : tab === "earnings" ? t.affiliate.emptyEarnings : t.affiliate.emptyReferred}
        </EmptyPanel>
      )}
    </div>
  );
}

function MemberLinkRow({
  url,
  copied,
  onCopy,
  onQr,
  onTelegram,
}: {
  url: string | null;
  copied: boolean;
  onCopy: () => void;
  onQr: () => void;
  onTelegram: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex w-full min-w-0 items-center gap-2 max-[900px]:justify-center">
      <div className="relative z-[2] inline-flex min-h-[51.47px] min-w-0 flex-1 overflow-visible rounded-[10px] bg-[#162630]">
        <div className="flex min-h-[51.47px] min-w-0 flex-1 items-center rounded-l-[10px] px-4 py-2.5 text-sm font-medium break-all text-white">
          {url ?? t.affiliate.noReferralLink}
        </div>
        <button
          type="button"
          onClick={onCopy}
          disabled={!url}
          aria-label={copied ? t.affiliate.referralCopied : t.affiliate.referralCopy}
          className="relative inline-flex w-[51px] min-h-[51.47px] shrink-0 items-center justify-center rounded-r-lg border-0 bg-brand text-lobby hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local icon */}
          <img src="/affiliate/copy.svg" alt="" className="size-5" />
        </button>
      </div>
      <IconCircleButton onClick={onQr} label={t.affiliate.qrTitle} src="/affiliate/qr.svg" />
      <IconCircleButton onClick={onTelegram} label="Telegram" src="/affiliate/telegram.svg" disabled={!url} />
    </div>
  );
}

function IconCircleButton({ onClick, label, src, disabled }: { onClick: () => void; label: string; src: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex size-[51.47px] shrink-0 items-center justify-center rounded-lg border-0 bg-brand text-lobby hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local icon */}
      <img src={src} alt="" className="size-6 object-contain" />
    </button>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <article className="flex min-h-[88px] items-center gap-5 rounded-xl bg-[#22333f] px-6 py-5 min-[769px]:min-h-[126px] min-[769px]:gap-8 min-[769px]:pr-10 min-[769px]:pl-[39px]">
      {/* eslint-disable-next-line @next/next/no-img-element -- local icon */}
      <img src={icon} alt="" className="size-11 object-contain min-[769px]:size-[52px]" />
      <div>
        <span className="mb-0.5 block text-xs leading-[18px] font-semibold text-white min-[769px]:mb-1.5 min-[769px]:text-sm min-[769px]:leading-[21px]">{label}</span>
        <strong className="text-lg leading-[27px] font-bold text-brand min-[769px]:text-2xl min-[769px]:leading-9">{value}</strong>
      </div>
    </article>
  );
}

function FeatureGrid() {
  const { t } = useI18n();
  const items = [
    { icon: "/affiliate/icon-games.svg", value: t.affiliate.featureCasinoShort, label: t.affiliate.featureCasino },
    { icon: "/affiliate/icon-rocket.svg", value: t.affiliate.featureOriginalShort, label: t.affiliate.featureOriginal },
    { icon: "/affiliate/vip.svg", value: t.affiliate.featureBonusesShort, label: t.affiliate.featureBonuses },
  ];
  return (
    <div className="mt-5 grid grid-cols-1 gap-5 min-[769px]:grid-cols-3 min-[769px]:gap-4">
      {items.map((item) => (
        <article key={item.label} className="flex min-h-[78px] items-center gap-5 rounded-xl bg-[#22333f] px-6 min-[769px]:min-h-[126px] min-[769px]:gap-[29px] min-[769px]:px-[39px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- local icon */}
          <img src={item.icon} alt="" className="size-8 object-contain min-[769px]:size-[42px]" />
          <div>
            <strong className="block text-xl leading-8 font-bold text-brand min-[769px]:text-2xl min-[769px]:leading-9">{item.value}</strong>
            <span className="block text-sm leading-[21px] font-semibold text-white">{item.label}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function HowToStart({ rate, cta, onCta }: { rate: number; cta: string; onCta: () => void }) {
  const { t } = useI18n();
  const steps = [
    { prefix: t.affiliate.step1Prefix, title: t.affiliate.step1Title, description: t.affiliate.step1Description },
    { prefix: t.affiliate.step2Prefix, title: t.affiliate.step2Title, description: t.affiliate.step2Description },
    { prefix: t.affiliate.step3Prefix, title: t.affiliate.step3Title, description: t.affiliate.step3Description },
  ];
  return (
    <section className="mt-7 rounded-xl bg-[#22333f] px-[1.625rem] py-[1.9125rem] pb-[1.375rem] min-[769px]:mt-7 min-[769px]:px-9 min-[769px]:py-7">
      <h2 className="m-0 text-center text-lg leading-[27px] font-bold text-white min-[769px]:text-left min-[769px]:text-2xl min-[769px]:leading-9">{t.affiliate.howToGetStarted}</h2>
      <div className="mt-[1.375rem] grid grid-cols-1 items-center gap-6 min-[901px]:grid-cols-[minmax(0,637px)_minmax(0,1fr)] min-[901px]:gap-9">
        <div className="relative flex min-h-[183px] items-center justify-end min-[769px]:min-h-[342px] min-[769px]:pr-[3.375rem]">
          <div className="absolute top-[15%] left-0 z-[2] flex min-h-[86px] w-[min(187px,60%)] items-center gap-2 rounded-[10px] border border-brand bg-[#22333f] px-4 py-3 min-[769px]:top-[24%] min-[769px]:min-h-[133px] min-[769px]:w-[268px] min-[769px]:gap-4 min-[769px]:px-7 min-[769px]:py-[1.125rem]">
            {/* eslint-disable-next-line @next/next/no-img-element -- local icon */}
            <img src="/affiliate/commission-rate.svg" alt="" className="h-7 w-8 object-contain min-[769px]:h-[42px] min-[769px]:w-[49px]" />
            <div>
              <span className="block text-xs leading-[18px] font-semibold text-white min-[769px]:text-sm min-[769px]:leading-[21px]">{t.affiliate.commissionRate}</span>
              <strong className="block text-4xl leading-[54px] font-bold text-brand min-[769px]:text-[50px] min-[769px]:leading-[75px]">{rate}%</strong>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- local illustration */}
          <img src="/affiliate/coins.svg" alt="" className="aspect-[352/342] w-[min(187px,52%)] object-contain min-[769px]:max-h-[342px] min-[769px]:w-[min(351px,82%)]" />
        </div>
        <div className="flex flex-col items-start gap-6 min-[769px]:gap-9">
          {steps.map((step) => (
            <div key={step.title}>
              <h3 className="m-0 mb-2.5 text-sm leading-[21px] font-bold text-white min-[769px]:mb-[0.6875rem] min-[769px]:text-lg min-[769px]:leading-[27px]">
                <span className="text-brand">{step.prefix}</span> {step.title}
              </h3>
              <p className="m-0 text-xs leading-[18px] font-medium text-[#9baab2] min-[769px]:text-sm min-[769px]:leading-[21px]">{step.description}</p>
            </div>
          ))}
          <PrimaryButton onClick={onCta}>{cta}</PrimaryButton>
        </div>
      </div>
    </section>
  );
}

function CommissionPanel({ formula }: { formula: string }) {
  const { t } = useI18n();
  return (
    <section className="mt-7 rounded-xl bg-[#22333f] px-[1.625rem] py-[1.9125rem] min-[769px]:px-9 min-[769px]:py-7">
      <h2 className="m-0 text-center text-lg leading-[27px] font-bold text-white min-[769px]:text-left min-[769px]:text-2xl min-[769px]:leading-9">{t.affiliate.howCommissionCalculated}</h2>
      <div className="mt-5 grid grid-cols-1 gap-3 min-[769px]:mt-5 min-[769px]:grid-cols-2 min-[769px]:gap-[33px]">
        <article className="min-h-[135px] rounded-xl bg-[#162630] p-5 min-[769px]:min-h-[166px] min-[769px]:px-[1.875rem] min-[769px]:py-[1.625rem]">
          <h3 className="m-0 mb-1.5 flex items-center gap-2 text-sm leading-[21px] font-bold text-white min-[769px]:mb-2.5 min-[769px]:text-lg min-[769px]:leading-[27px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- local icon */}
            <img src="/affiliate/baccarat.svg" alt="" className="size-5 object-contain" /> {t.affiliate.casino}
          </h3>
          <p className="mb-7 text-xs leading-[18px] font-medium text-[#9baab2] min-[769px]:mb-[1.375rem] min-[769px]:text-base min-[769px]:leading-6">{t.affiliate.casinoEdgeDescription}</p>
          <strong className="text-xs leading-[18px] font-medium text-white min-[769px]:text-base min-[769px]:leading-6">{formula}</strong>
        </article>
        <article className="min-h-[135px] rounded-xl bg-[#162630] p-5 min-[769px]:min-h-[166px] min-[769px]:px-[1.875rem] min-[769px]:py-[1.625rem]">
          <h3 className="m-0 mb-1.5 flex items-center gap-2 text-sm leading-[21px] font-bold text-white min-[769px]:mb-2.5 min-[769px]:text-lg min-[769px]:leading-[27px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- local icon */}
            <img src="/affiliate/allsports.svg" alt="" className="size-5 object-contain" /> {t.affiliate.sportsbook}
          </h3>
          <p className="mb-7 text-xs leading-[18px] font-medium text-[#9baab2] min-[769px]:mb-[1.375rem] min-[769px]:text-base min-[769px]:leading-6">{t.affiliate.sportsbookDescription}</p>
          <strong className="text-xs leading-[18px] font-medium text-white min-[769px]:text-base min-[769px]:leading-6">{formula}</strong>
        </article>
      </div>
    </section>
  );
}

function MoreInfo({ onContact }: { onContact: () => void }) {
  const { t } = useI18n();
  return (
    <section className="mt-7 rounded-xl bg-[#22333f] px-[13.5px] py-[1.9125rem] min-[769px]:px-9 min-[769px]:py-7">
      <h2 className="m-0 text-center text-lg leading-[27px] font-bold text-white min-[769px]:text-left min-[769px]:text-2xl min-[769px]:leading-9">{t.affiliate.moreInformation}</h2>
      <div className="mt-5 grid grid-cols-1 gap-3 min-[769px]:mt-5 min-[769px]:grid-cols-2 min-[769px]:gap-[33px]">
        <article className="grid grid-cols-1 items-center justify-items-center gap-5 rounded-xl bg-[#162630] p-8 text-center min-[769px]:min-h-[240px] min-[769px]:grid-cols-[156px_1fr] min-[769px]:justify-items-stretch min-[769px]:text-left">
          {/* eslint-disable-next-line @next/next/no-img-element -- local illustration */}
          <img src="/affiliate/become-partner.svg" alt="" className="mx-auto max-h-28 object-contain" />
          <div>
            <h3 className="m-0 mb-3 text-sm leading-[21px] font-bold text-white min-[769px]:mb-2 min-[769px]:text-lg min-[769px]:leading-[27px]">{t.affiliate.becomePartner}</h3>
            <p className="mb-5 text-xs leading-[18px] font-medium text-[#9baab2] min-[769px]:mb-4 min-[769px]:text-sm min-[769px]:leading-[21px]">{t.affiliate.becomePartnerDescription}</p>
            <PrimaryButton onClick={onContact}>{t.affiliate.contactUs}</PrimaryButton>
          </div>
        </article>
        <article className="grid grid-cols-1 items-center justify-items-center gap-5 rounded-xl bg-[#162630] p-8 text-center min-[769px]:min-h-[240px] min-[769px]:grid-cols-[156px_1fr] min-[769px]:justify-items-stretch min-[769px]:text-left">
          {/* eslint-disable-next-line @next/next/no-img-element -- local illustration */}
          <img src="/affiliate/promotional.svg" alt="" className="mx-auto max-h-28 object-contain" />
          <div>
            <h3 className="m-0 mb-3 text-sm leading-[21px] font-bold text-white min-[769px]:mb-2 min-[769px]:text-lg min-[769px]:leading-[27px]">{t.affiliate.promotionalMaterials}</h3>
            <p className="mb-5 text-xs leading-[18px] font-medium text-[#9baab2] min-[769px]:mb-4 min-[769px]:text-sm min-[769px]:leading-[21px]">{t.affiliate.promotionalMaterialsDescription}</p>
            <PrimaryButton onClick={onContact}>{t.affiliate.getMaterials}</PrimaryButton>
          </div>
        </article>
      </div>
    </section>
  );
}

function FaqPanel({ openFaq, setOpenFaq }: { openFaq: string | null; setOpenFaq: (value: string | null) => void }) {
  const { t } = useI18n();
  return (
    <section id="affiliate-faq" className="mt-7 rounded-xl bg-[#22333f] px-[1.625rem] py-[1.9125rem] min-[769px]:px-9 min-[769px]:py-7">
      <h2 className="m-0 text-center text-lg leading-[27px] font-bold text-white min-[769px]:text-left min-[769px]:text-2xl min-[769px]:leading-9">{t.affiliate.faqTitle}</h2>
      <div className="mt-5 divide-y divide-white/10 overflow-hidden rounded-xl bg-[#162630]">
        {t.affiliate.faq.map((item) => {
          const open = openFaq === item.q;
          return (
            <div key={item.q}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenFaq(open ? null : item.q)}
                className="flex w-full items-center justify-between gap-4 bg-transparent px-5 py-4 text-left text-sm font-semibold text-white hover:bg-white/5"
              >
                {item.q}
                <span aria-hidden="true" className={`text-[#9baab2] transition-transform ${open ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </button>
              {open ? <p className="px-5 pb-4 text-sm leading-6 text-[#9baab2]">{item.a}</p> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EmptyPanel({ children }: { children: string }) {
  return <div className="mt-4 flex min-h-48 items-center justify-center rounded-xl bg-[#22333f] px-4 py-8 text-center text-sm font-medium text-[#9baab2]">{children}</div>;
}

function QrDialog({ url, copied, onCopy, onClose }: { url: string | null; copied: boolean; onCopy: () => void; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="affiliate-qr-title">
      <div className="w-full max-w-sm rounded-xl bg-[#1e2c38] p-6 shadow-[0_8px_24px_#0009]">
        <h2 id="affiliate-qr-title" className="m-0 mb-4 text-lg font-bold text-white">
          {t.affiliate.qrTitle}
        </h2>
        <p className="mb-4 break-all text-sm font-medium text-[#9baab2]">{url ?? t.affiliate.noReferralLink}</p>
        <div className="flex flex-wrap gap-3">
          <PrimaryButton onClick={onCopy} disabled={!url}>
            {copied ? t.affiliate.referralCopied : t.affiliate.referralCopy}
          </PrimaryButton>
          <button type="button" onClick={onClose} className="inline-flex min-h-[51.47px] items-center justify-center rounded-[10px] border-0 bg-transparent px-4 text-sm font-bold text-white underline">
            {t.affiliate.close}
          </button>
        </div>
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-[51.47px] items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-extrabold text-lobby hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}
