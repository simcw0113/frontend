import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Outfit } from "next/font/google";
import { BootLoader } from "@/components/BootLoader";
import { I18nProvider } from "@/components/I18nProvider";
import { SkipLink } from "@/components/SkipLink";
import { siteConfig } from "@/config/site";
import { htmlLang, uiLocale } from "@/i18n";
import { isSlug } from "@/i18n/routing";
import { getSiteLanguages } from "@/lib/siteLanguages";
import "../globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

// The languages configured in the backoffice (GET /config data.languages); English only
// when /config is unreachable at build time. Other configured codes render on demand.
export async function generateStaticParams() {
  return (await getSiteLanguages()).map(({ code }) => ({ lang: code }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = uiLocale(lang);
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
  // The proxy already sends languages /config does not list to a configured one.
  const languages = await getSiteLanguages();
  const locale = uiLocale(lang); // UI strings: en / zh / bm / vi / th, English for any other code

  return (
    <html lang={htmlLang(locale)} className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <I18nProvider lang={lang} languages={languages}>
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
