"use client";

import { Suspense, use, useEffect, useState, type ReactNode, type SVGProps } from "react";
import { useI18n } from "@/components/I18nProvider";
import { Avatar, initialsFrom } from "@/components/lobby/Avatar";
import { GameCover, gameHref } from "@/components/lobby/GameCover";
import { defaultCasinoCategory } from "@/config/categories";
import { fill } from "@/i18n";
import type { CategoryGamesResult } from "@/lib/games";
import { parseProfileTab, PROFILE_TABS, type ProfileTabId } from "@/lib/profileTabs";
import type { SessionUser } from "@/lib/session";
import { useSession } from "@/lib/useSession";

// Member profile area (/{lang}/profile?tab=…). Kickwin-style two-column shell:
// a sub-sidebar of 9 tabs on desktop, a compact label + logout row and
// horizontal tabs on phones. Only "My Profile" is implemented; the others
// show a coming-soon state. The dashboard is read-only.
// The active tab is read from the URL on the client (history.pushState) so the
// server page never touches searchParams (those would block the instant App Shell).

const CARD = "rounded-2xl bg-[#1e2c38] p-4 sm:p-6";
const SECONDARY = "text-white/70";

export function ProfilePage({
  favourites,
  onSignIn,
}: {
  favourites?: Promise<CategoryGamesResult>;
  onSignIn: () => void;
}) {
  const { t } = useI18n();
  const { user, ready, signOut } = useSession();
  // SSR and the first client render stay on "profile" to avoid a hydration
  // mismatch; the URL is applied after mount (deep links like ?tab=security).
  const [tab, setTab] = useState<ProfileTabId>("profile");

  useEffect(() => {
    function read() {
      return parseProfileTab(new URLSearchParams(window.location.search).get("tab"));
    }
    function onPop() {
      setTab(read());
    }
    window.addEventListener("popstate", onPop);
    void Promise.resolve().then(() => {
      const next = read();
      const url = new URL(window.location.href);
      if (!url.searchParams.get("tab")) {
        url.searchParams.set("tab", next);
        window.history.replaceState(window.history.state, "", url);
      }
      setTab(next);
    });
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function selectTab(next: ProfileTabId) {
    setTab(next);
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") === next) return;
    url.searchParams.set("tab", next);
    window.history.pushState(window.history.state, "", url);
  }

  const current = PROFILE_TABS.find((item) => item.id === tab) ?? PROFILE_TABS[0];
  const currentLabel = t.profile[current.labelKey];

  if (!ready) return <ProfileSkeleton />;
  if (!user) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className={`text-sm ${SECONDARY}`}>{t.profile.signIn}</p>
        <button type="button" onClick={onSignIn} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-lobby">
          {t.auth.signIn}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1 flex flex-col gap-4 md:mt-2 md:flex-row md:items-start md:gap-6">
      <div className="flex items-center justify-between md:hidden">
        <h1 className="text-lg font-semibold text-white">{currentLabel}</h1>
        <button type="button" onClick={() => void signOut()} className="text-sm font-semibold text-white/80 hover:text-white">
          {t.profile.logout}
        </button>
      </div>

      <div className="md:hidden -mx-3 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabList tab={tab} onSelect={selectTab} className="flex w-max gap-1.5 pb-1" />
      </div>

      <aside className="hidden w-56 shrink-0 md:block lg:w-60">
        <h1 className="mb-3 text-xl font-bold text-white">{t.profile.title}</h1>
        <TabList tab={tab} onSelect={selectTab} className="flex flex-col gap-0.5" vertical />
      </aside>

      <div className="min-w-0 flex-1" role="tabpanel" id={`profile-panel-${tab}`} aria-labelledby={`profile-tab-${tab}`}>
        {tab === "profile" ? (
          <MyProfile user={user} favourites={favourites} onVerify={() => selectTab("verification")} />
        ) : (
          <div className={`${CARD} py-16 text-center`}>
            <p className={`text-sm ${SECONDARY}`}>{t.profile.comingSoon}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TabList({
  tab,
  onSelect,
  className,
  vertical = false,
}: {
  tab: ProfileTabId;
  onSelect: (id: ProfileTabId) => void;
  className?: string;
  vertical?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div role="tablist" aria-label={t.profile.title} className={className}>
      {PROFILE_TABS.map((item) => {
        const selected = item.id === tab;
        const Icon = TAB_ICONS[item.id];
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`profile-tab-${item.id}`}
            aria-selected={selected}
            aria-controls={`profile-panel-${item.id}`}
            onClick={() => onSelect(item.id)}
            className={`inline-flex shrink-0 items-center gap-2.5 rounded-xl text-sm font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              vertical ? "w-full px-3 py-2.5" : "px-3 py-2"
            } ${selected ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
          >
            <Icon className="size-5 shrink-0" />
            {t.profile[item.labelKey]}
          </button>
        );
      })}
    </div>
  );
}

function MyProfile({
  user,
  favourites,
  onVerify,
}: {
  user: SessionUser;
  favourites?: Promise<CategoryGamesResult>;
  onVerify: () => void;
}) {
  const { t } = useI18n();
  const dash = t.profile.empty;
  const initials = initialsFrom(user.full_name || user.username);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <section className={CARD}>
        <div className="flex items-start gap-4">
          <Avatar src={user.profile_image} initials={initials} name={user.username} labelled />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-semibold text-white">{user.username}</h2>
              <button
                type="button"
                aria-label={t.profile.edit}
                title={t.profile.edit}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <PencilIcon className="size-4" />
              </button>
            </div>
            {user.full_name ? <p className={`mt-0.5 truncate text-sm ${SECONDARY}`}>{user.full_name}</p> : null}
            <div className={`mt-3 flex flex-col gap-2 text-sm ${SECONDARY}`}>
              <UserIdRow value={user.user_id || dash} />
              <p>{fill(t.profile.birthday, { value: formatBirthday(user.birthday, dash) })}</p>
              <p className="flex flex-wrap items-center gap-2">
                <span>
                  {t.profile.phone} {user.phone || dash}
                </span>
                {user.phone_verified ? <VerifiedBadge /> : <VerifyBadge onClick={onVerify} />}
              </p>
              <p>
                {t.profile.email} {user.email || dash}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={CARD}>
        <h3 className="text-base font-semibold text-white">{t.profile.statistics}</h3>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          <StatTile icon={<WinsIcon />} label={t.profile.totalWins} value={formatAmount(user.total_wins, dash)} />
          <StatTile icon={<WageredIcon />} label={t.profile.totalWagered} value={formatAmount(user.total_wagered, dash)} />
          <StatTile icon={<BetsIcon />} label={t.profile.totalBets} value={formatCount(user.total_bets, dash)} />
        </div>
      </section>

      <section className={CARD}>
        <h3 className="text-base font-semibold text-white">{t.profile.topFavourites}</h3>
        <div className="mt-4">
          {favourites ? (
            <Suspense fallback={<FavouritesSkeleton />}>
              <TopFavourites promise={favourites} />
            </Suspense>
          ) : (
            <p className={`py-6 text-center text-sm ${SECONDARY}`}>{t.profile.noFavourites}</p>
          )}
        </div>
      </section>

      <section className={CARD}>
        <h3 className="text-base font-semibold text-white">{t.profile.wagerContest}</h3>
        <p className={`py-8 text-center text-sm ${SECONDARY}`}>{t.profile.noContest}</p>
      </section>
    </div>
  );
}

function UserIdRow({ value }: { value: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const canCopy = value.trim() !== "" && value !== t.profile.empty;

  async function copy() {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <p className="flex flex-wrap items-center gap-2">
      <span>{fill(t.profile.userId, { value })}</span>
      <button
        type="button"
        onClick={() => void copy()}
        disabled={!canCopy}
        aria-label={copied ? t.profile.copied : t.profile.copyId}
        title={copied ? t.profile.copied : t.profile.copyId}
        className="grid size-7 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {copied ? (
          <span className="text-[10px] font-semibold text-emerald-400">{t.profile.copied}</span>
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </button>
    </p>
  );
}

function VerifyBadge({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-full bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand hover:bg-brand/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {t.profile.verifyNow}
    </button>
  );
}

function VerifiedBadge() {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
      {t.profile.verified}
    </span>
  );
}

function formatBirthday(value: string | null, empty: string) {
  if (!value) return empty;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : value;
}

function formatAmount(value: number | null, empty: string) {
  if (value == null || !Number.isFinite(value)) return empty;
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCount(value: number | null, empty: string) {
  if (value == null || !Number.isFinite(value)) return empty;
  return Math.trunc(value).toLocaleString();
}

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-white/5 px-2 py-3 text-center sm:px-3 sm:py-4">
      <span className="grid size-9 place-items-center rounded-full bg-white/10 text-white/80">{icon}</span>
      <p className={`text-[11px] leading-tight sm:text-xs ${SECONDARY}`}>{label}</p>
      <p className="text-sm font-semibold text-white sm:text-base">{value}</p>
    </div>
  );
}

function TopFavourites({ promise }: { promise: Promise<CategoryGamesResult> }) {
  const { t } = useI18n();
  const result = use(promise);
  const games = result.games.slice(0, 3);
  if (result.error || games.length === 0) {
    return <p className={`py-6 text-center text-sm ${SECONDARY}`}>{t.profile.noFavourites}</p>;
  }
  const category = defaultCasinoCategory.slug;
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {games.map((game) => (
        <GameCover key={game.id} game={game} href={gameHref(game, category)} fluid />
      ))}
    </div>
  );
}

function FavouritesSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-hidden="true">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="aspect-[3/4] rounded-xl bg-white/5 motion-safe:animate-pulse" />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-start md:gap-6" aria-hidden="true">
      <div className="hidden w-56 shrink-0 md:block">
        <div className="h-7 w-24 rounded-md bg-white/5 motion-safe:animate-pulse" />
        <div className="mt-3 space-y-1">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="h-10 rounded-xl bg-white/5 motion-safe:animate-pulse" />
          ))}
        </div>
      </div>
      <div className={`${CARD} min-w-0 flex-1`}>
        <div className="flex gap-4">
          <div className="size-16 rounded-full bg-white/5 motion-safe:animate-pulse sm:size-20" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-40 rounded-md bg-white/5 motion-safe:animate-pulse" />
            <div className="h-4 w-28 rounded-md bg-white/5 motion-safe:animate-pulse" />
            <div className="h-4 w-48 rounded-md bg-white/5 motion-safe:animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

type IconProps = SVGProps<SVGSVGElement>;

function iconProps(props: IconProps): IconProps {
  return { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, ...props };
}

function ProfileTabIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19c1.4-3 4-4.5 7-4.5s5.6 1.5 7 4.5" />
    </svg>
  );
}
function VerificationIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 3.5 19 6.5v5.2c0 4.4-3.2 7.4-7 8.8-3.8-1.4-7-4.4-7-8.8V6.5Z" />
      <path d="M9 12.2 11.1 14.3 15.2 10" />
    </svg>
  );
}
function SecurityIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="6" y="10" width="12" height="10" rx="2" />
      <path d="M9 10 V7.5 a3 3 0 0 1 6 0 V10" />
    </svg>
  );
}
function BankingIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 9.5 12 4.5 20 9.5" />
      <path d="M6 10.5 V17.5 H18 V10.5 M4 17.5 H20" />
    </svg>
  );
}
function SwapIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M7 7 H19 l-3-3 M17 17 H5 l3 3" />
    </svg>
  );
}
function TransactionsIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M8 9 H16 M8 13 H16 M8 17 H13" />
    </svg>
  );
}
function RolloverIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4.5 12 a7.5 7.5 0 1 0 2.2-5.4" />
      <path d="M4.5 6.5 V12 H10" />
    </svg>
  );
}
function HistoryIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5 V12 l3.2 2" />
    </svg>
  );
}
function PosterIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 10.5 a3 2.2 0 1 0 6 0 a3 2.2 0 1 0 -6 0 M8 17 l2.3-2.5 2.2 1.8 2.3-3 L16 17" />
    </svg>
  );
}

const TAB_ICONS: Record<ProfileTabId, (props: IconProps) => ReactNode> = {
  profile: ProfileTabIcon,
  verification: VerificationIcon,
  security: SecurityIcon,
  banking: BankingIcon,
  swap: SwapIcon,
  transactions: TransactionsIcon,
  rollover: RolloverIcon,
  history: HistoryIcon,
  poster: PosterIcon,
};

function PencilIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4.5 16.5 15.8 5.2 a1.8 1.8 0 0 1 2.5 0 l.5.5 a1.8 1.8 0 0 1 0 2.5 L7.5 19.5 H4.5 Z" />
    </svg>
  );
}
function CopyIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="8" y="8" width="11" height="11" rx="1.8" />
      <path d="M6 15.5 V5.8 A1.8 1.8 0 0 1 7.8 4 H16" />
    </svg>
  );
}
function WinsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M7 5 h10 v3 a5 5 0 0 1-10 0 Z M9 16 h6 M12 13 v3 M8 19 h8" />
    </svg>
  );
}
function WageredIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 8 v8 M9.5 10.5 c0-1 1.2-1.7 2.5-1.7 s2.5.7 2.5 1.7-1 1.5-2.5 1.5-2.5.6-2.5 1.6 1.2 1.7 2.5 1.7 2.5-.7 2.5-1.7" />
    </svg>
  );
}
function BetsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <rect x="5" y="6" width="9" height="13" rx="1.5" transform="rotate(-12 9.5 12.5)" />
      <rect x="10" y="5" width="9" height="13" rx="1.5" transform="rotate(10 14.5 11.5)" />
    </svg>
  );
}
