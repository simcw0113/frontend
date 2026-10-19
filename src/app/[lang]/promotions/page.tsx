import type { Metadata } from "next";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { dictionaries } from "@/i18n";
import { fromSlug, isSlug, languageAlternates, localizedPath } from "@/i18n/routing";
import { getPromotions } from "@/lib/promotions";

const PATH = "/promotions";

export async function generateMetadata({ params }: PageProps<"/[lang]/promotions">): Promise<Metadata> {
  const { lang } = await params;
  const t = dictionaries[isSlug(lang) ? fromSlug(lang) : "en"];
  return {
    title: t.promotions.title,
    description: t.promotions.meta,
    alternates: {
      canonical: isSlug(lang) ? localizedPath(lang, PATH) : undefined,
      languages: languageAlternates(PATH),
    },
  };
}

// The lobby shell (header, sidebar, footer) with the promotions grid. The list is started
// here and streamed through <Suspense> (skeleton until it resolves).
export default async function PromotionsPage({ params }: PageProps<"/[lang]/promotions">) {
  const { lang } = await params;
  return <LobbyScreen focus="promotions" games={{}} promotions={getPromotions({ lang })} />;
}
