import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { casinoCategories, findCasinoCategory } from "@/config/categories";
import { getCategoryGames } from "@/lib/games";
import { isSlug, languageAlternates, localizedPath } from "@/i18n/routing";

// TODO(API): the allow-list of slugs is config/categories.ts for now; take it from
// the API (categories endpoint) later and keep notFound() for unknown slugs.
export function generateStaticParams() {
  return casinoCategories.map(({ slug }) => ({ category: slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/casino/[category]">): Promise<Metadata> {
  const { lang, category: slug } = await params;
  const category = findCasinoCategory(slug);
  if (!category) return {};
  const path = `/casino/${category.slug}`;
  return {
    title: category.title,
    description: `All ${category.title.toLowerCase()}.`,
    alternates: {
      canonical: isSlug(lang) ? localizedPath(lang, path) : undefined,
      languages: languageAlternates(path),
    },
  };
}

export default async function CasinoCategoryPage({ params }: PageProps<"/[lang]/casino/[category]">) {
  const { lang, category: slug } = await params;
  const category = findCasinoCategory(slug);
  if (!category) notFound();
  // Not awaited: the lobby streams it through <Suspense> (skeleton until it resolves).
  const games = { [category.slug]: getCategoryGames(category.slug, { lang }) };
  return <LobbyScreen focus="casino" category={category.slug} games={games} />;
}
