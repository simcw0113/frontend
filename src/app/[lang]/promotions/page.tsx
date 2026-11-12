import type { Metadata } from "next";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { dictionaryFor } from "@/i18n";
import { languageAlternates, localizedPath } from "@/i18n/routing";
import { getSiteLanguages } from "@/lib/siteLanguages";
import { getPromotions } from "@/lib/promotions";

const PATH = "/promotions";

export async function generateMetadata({ params }: PageProps<"/[lang]/promotions">): Promise<Metadata> {
  const { lang } = await params;
  const t = dictionaryFor(lang);
  return {
    title: t.promotions.title,
    description: t.promotions.meta,
    alternates: {
      canonical: localizedPath(lang, PATH),
      languages: languageAlternates(PATH, await getSiteLanguages()),
    },
  };
}

// The lobby shell (header, sidebar, footer) with the promotions grid. The list is started
// here and streamed through <Suspense> (skeleton until it resolves).
export default async function PromotionsPage({ params }: PageProps<"/[lang]/promotions">) {
  const { lang } = await params;
  return <LobbyScreen focus="promotions" games={{}} promotions={getPromotions({ lang })} />;
}
