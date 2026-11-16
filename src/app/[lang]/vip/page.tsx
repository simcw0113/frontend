import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VIP_ENABLED } from "@/config/vip";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { dictionaryFor } from "@/i18n";
import { languageAlternates, localizedPath } from "@/i18n/routing";
import { getSiteLanguages } from "@/lib/siteLanguages";

const PATH = "/vip";

export async function generateMetadata({ params }: PageProps<"/[lang]/vip">): Promise<Metadata> {
  const { lang } = await params;
  const t = dictionaryFor(lang);
  return {
    title: t.topNav.vip,
    description: t.vip.meta,
    alternates: {
      canonical: localizedPath(lang, PATH),
      languages: languageAlternates(PATH, await getSiteLanguages()),
    },
  };
}

// VIP club inside the lobby shell. Figures are the sample in config/vip.ts.
export default function VipPage() {
  if (!VIP_ENABLED) notFound();
  return <LobbyScreen focus="vip" games={{}} />;
}
