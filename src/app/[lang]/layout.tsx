import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Outfit } from "next/font/google";
import { BootLoader } from "@/components/BootLoader";
import { I18nProvider } from "@/components/I18nProvider";
import { SkipLink } from "@/components/SkipLink";
import { siteConfig } from "@/config/site";
import { htmlLang } from "@/i18n";
import { fromSlug, isSlug, localeSlugs } from "@/i18n/routing";
import "../globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export function generateStaticParams() {
  return localeSlugs.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isSlug(lang) ? fromSlug(lang) : "en";
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: siteConfig.name,
      template: `%s · ${siteConfig.name}`,
    },
    description: siteConfig.description,
    applicationName: siteConfig.name,
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: siteConfig.name,
      description: siteConfig.description,
      locale: htmlLang(locale).replace("-", "_"),
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isSlug(lang)) notFound();
  const locale = fromSlug(lang);

  return (
    <html lang={htmlLang(locale)} className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <I18nProvider locale={locale}>
          <BootLoader />
          <div id="app-shell">
            <SkipLink />
            {children}
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
