import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { localizedPath } from "@/i18n/routing";
import { getSiteLanguages } from "@/lib/siteLanguages";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const languages = await getSiteLanguages();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: languages.map(({ code }) => localizedPath(code, "/login")),
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
