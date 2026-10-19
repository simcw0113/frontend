import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { localeSlugs, localizedPath } from "@/i18n/routing";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: localeSlugs.map((slug) => localizedPath(slug, "/login")),
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
