import type { Metadata } from "next";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { dictionaryFor } from "@/i18n";
import { languageAlternates, localizedPath } from "@/i18n/routing";
import { getSiteLanguages } from "@/lib/siteLanguages";

const PATH = "/providers";

export async function generateMetadata({ params }: PageProps<"/[lang]/providers">): Promise<Metadata> {
  const { lang } = await params;
  const t = dictionaryFor(lang);
  return {
    title: t.lobby.providers,
    alternates: {
      canonical: localizedPath(lang, PATH),
      languages: languageAlternates(PATH, await getSiteLanguages()),
    },
  };
}

// Grid of every game provider (like KickWin /casino/providers); a card opens All Games on that provider.
export default function ProvidersPage() {
  return <LobbyScreen focus="providers" games={{}} />;
}
