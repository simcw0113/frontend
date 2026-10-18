"use client";

import { useI18n } from "@/components/I18nProvider";

export function SkipLink() {
  const { t } = useI18n();

  return (
    <a
      href="#content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-lobby"
    >
      {t.skip}
    </a>
  );
}
