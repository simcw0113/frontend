import type { Metadata } from "next";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { siteConfig } from "@/config/site";
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

export default function Home() {
  return <LobbyScreen />;
}
