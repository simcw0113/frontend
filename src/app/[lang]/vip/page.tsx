import type { Metadata } from "next";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { dictionaries } from "@/i18n";
import { fromSlug, isSlug, languageAlternates, localizedPath } from "@/i18n/routing";

const PATH = "/vip";

export async function generateMetadata({ params }: PageProps<"/[lang]/vip">): Promise<Metadata> {
  const { lang } = await params;
  const t = dictionaries[isSlug(lang) ? fromSlug(lang) : "en"];
  return {
    title: t.topNav.vip,
    description: t.comingSoon.vipMeta,
    alternates: {
      canonical: isSlug(lang) ? localizedPath(lang, PATH) : undefined,
      languages: languageAlternates(PATH),
    },
  };
}

// Placeholder inside the lobby shell (header, sidebar, footer): title + "Coming soon".
export default function VipPage() {
  return <LobbyScreen focus="vip" games={{}} />;
}
