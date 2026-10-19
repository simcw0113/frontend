import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
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

// Instant navigation (Partial Prefetching): `params` is URL data, so it is not awaited here.
// The lobby shell (header, sidebar, search bar, category title, footer) renders without it and
// is shared by every category link; the slug is read in the client with useParams(). The game
// list is a promise chained on `params` and streamed through the grid's <Suspense> (skeleton
// until it resolves, which the lobby view transition waits for).
// Unknown slugs get a real 404 from proxy.ts before reaching this page; CategoryGuard keeps
// notFound() as a backstop, inside <Suspense> so it does not pull URL data into the shell.
export default function CasinoCategoryPage({ params }: PageProps<"/[lang]/casino/[category]">) {
  const categoryGames = params.then(({ lang, category }) => getCategoryGames(category, { lang }));
  return (
    <>
      <LobbyScreen focus="casino" games={{}} categoryGames={categoryGames} />
      <Suspense fallback={null}>
        <CategoryGuard params={params} />
      </Suspense>
    </>
  );
}

async function CategoryGuard({ params }: Pick<PageProps<"/[lang]/casino/[category]">, "params">) {
  const { category } = await params;
  if (!findCasinoCategory(category)) notFound();
  return null;
}
