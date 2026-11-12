import type { MetadataRoute } from "next";
import { casinoCategories } from "@/config/categories";
import { siteConfig } from "@/config/site";
import { languageAlternates, localizedPath } from "@/i18n/routing";
import { getSiteLanguages } from "@/lib/siteLanguages";

const pages = [
  { path: "/", priority: 1 },
  ...casinoCategories.map(({ slug }) => ({ path: `/casino/${slug}`, priority: 0.8 })),
  { path: "/promotions", priority: 0.7 },
  { path: "/sports", priority: 0.5 },
  { path: "/vip", priority: 0.5 },
  { path: "/z-ai", priority: 0.5 },
  { path: "/missions", priority: 0.5 },
];

// One entry per language and page, each listing its translations.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteLanguages = await getSiteLanguages();
  return pages.flatMap(({ path, priority }) => {
    const languages = Object.fromEntries(
      Object.entries(languageAlternates(path, siteLanguages)).map(([lang, href]) => [lang, `${siteConfig.url}${href}`]),
    );
    return siteLanguages.map(({ code }) => ({
      url: `${siteConfig.url}${localizedPath(code, path)}`,
      changeFrequency: "weekly" as const,
      priority,
      alternates: { languages },
    }));
  });
}
