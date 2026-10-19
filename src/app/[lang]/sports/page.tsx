import type { Metadata } from "next";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { dictionaries } from "@/i18n";
import { fromSlug, isSlug, languageAlternates, localizedPath } from "@/i18n/routing";

const PATH = "/sports";

export async function generateMetadata({ params }: PageProps<"/[lang]/sports">): Promise<Metadata> {
  const { lang } = await params;
  const t = dictionaries[isSlug(lang) ? fromSlug(lang) : "en"];
  return {
    title: t.topNav.sports,
    description: t.comingSoon.sportsMeta,
    alternates: {
      canonical: isSlug(lang) ? localizedPath(lang, PATH) : undefined,
      languages: languageAlternates(PATH),
    },
  };
}

// Placeholder inside the lobby shell (header, sidebar, footer): title + "Coming soon".
export default function SportsPage() {
  return <LobbyScreen focus="sports" games={{}} />;
}
