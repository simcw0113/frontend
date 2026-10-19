import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { casinoCategories, findCasinoCategory } from "@/config/categories";
import { isSlug, languageAlternates, localizedPath } from "@/i18n/routing";

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
  const { category: slug } = await params;
  const category = findCasinoCategory(slug);
  if (!category) notFound();
  return <LobbyScreen focus="casino" category={category.slug} />;
}
