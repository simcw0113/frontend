import type { Metadata } from "next";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { dictionaryFor } from "@/i18n";
import { languageAlternates, localizedPath } from "@/i18n/routing";
import { getSiteLanguages } from "@/lib/siteLanguages";
import { getAuthTokenFromCookie } from "@/lib/authCookie";
import { getFavouriteGames } from "@/lib/playerGames";

const PATH = "/profile";

// The player's own profile: not indexed (robots noindex) and not in the sitemap.
export async function generateMetadata({ params }: PageProps<"/[lang]/profile">): Promise<Metadata> {
  const { lang } = await params;
  const t = dictionaryFor(lang);
  return {
    title: t.profile?.title ?? t.bottomNav.profile ?? "Profile",
    description: t.profile?.meta ?? "",
    robots: { index: false, follow: false },
    alternates: {
      canonical: localizedPath(lang, PATH),
      languages: languageAlternates(PATH, await getSiteLanguages()),
    },
  };
}

// Same Instant-navigation pattern as /recent and /favourites: do not await
// `params` (or `searchParams`) in this page. The tab is applied from the URL
// on the client; the favourites list is a promise streamed through <Suspense>.
export default function ProfileRoute({ params }: PageProps<"/[lang]/profile">) {
  const favourites = params.then(async ({ lang }) => {
    const token = await getAuthTokenFromCookie();
    return getFavouriteGames({ lang, token });
  });
  return <LobbyScreen focus="profile" games={{}} profileFavourites={favourites} />;
}
