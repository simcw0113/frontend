import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="font-serif text-base text-ink">{siteConfig.name}</p>
        <p>© 2026</p>
      </div>
    </footer>
  );
}
