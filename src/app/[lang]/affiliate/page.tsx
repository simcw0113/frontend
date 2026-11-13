import type { Metadata } from "next";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { dictionaryFor } from "@/i18n";
import { languageAlternates, localizedPath } from "@/i18n/routing";
import { getSiteLanguages } from "@/lib/siteLanguages";

const PATH = "/affiliate";

export async function generateMetadata({ params }: PageProps<"/[lang]/affiliate">): Promise<Metadata> {
  const { lang } = await params;
  const t = dictionaryFor(lang);
  return {
    title: t.affiliate?.title ?? t.menu.affiliate ?? "Affiliate",
    description: t.affiliate?.meta ?? t.affiliate?.heroBody ?? "",
    alternates: {
      canonical: localizedPath(lang, PATH),
      languages: languageAlternates(PATH, await getSiteLanguages()),
    },
  };
}

// Affiliate programme inside the lobby shell. Commission figures are the sample in config/affiliate.ts.
export default function AffiliateRoute() {
  return <LobbyScreen focus="affiliate" games={{}} />;
}
