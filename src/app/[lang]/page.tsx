import type { Metadata } from "next";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { homeCategories } from "@/config/categories";
import { siteConfig } from "@/config/site";
import { getCategoryGames } from "@/lib/games";
import { getPartners } from "@/lib/partners";
import { getTopWins } from "@/lib/topWins";
import { isSlug, languageAlternates, localizedPath } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  return {
    description: siteConfig.description,
    alternates: {
      canonical: isSlug(lang) ? localizedPath(lang, "/") : undefined,
      languages: languageAlternates("/"),
    },
  };
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  // Same data function (and cache keys) as the category pages; the home rows show a preview slice.
  const games = Object.fromEntries(
    homeCategories.map(({ slug }) => [slug, getCategoryGames(slug, { lang })]),
  );
  return <LobbyScreen games={games} topWins={getTopWins({ lang })} partners={getPartners({ lang })} />;
}
5