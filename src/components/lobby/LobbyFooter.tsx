"use client";

import { useI18n } from "@/components/I18nProvider";
import { fill } from "@/i18n";

const socials = [
  { name: "Facebook", path: "M14 8h2V5h-2c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.2l.8-3H13V9c0-.6.4-1 1-1Z" },
  { name: "Instagram", path: "M8 4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Zm8 2H8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm-4 2.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5Zm0 2A1.5 1.5 0 1 0 13.5 12 1.5 1.5 0 0 0 12 10.5ZM16.8 7.2a1 1 0 1 1-1 1 1 1 0 0 1 1-1Z" },
  { name: "Telegram", path: "M19.5 6.2 4.8 11.7c-.9.3-.9 1.6.1 1.9l3.6 1.1 1.4 4.3c.3.8 1.3 1 1.9.4l2-1.9 3.7 2.7c.7.5 1.7.1 1.9-.7l2.4-11.4c.2-1.1-.8-2-1.8-1.6ZM9.2 13.6l7.4-4.6c.2-.1.4.2.2.3l-6 5.4-.2 2.4Z" },
  { name: "TikTok", path: "M14 5c.4 2.2 1.8 3.6 4 3.8v2.2c-1.4 0-2.7-.4-3.8-1.2v5.6A5.4 5.4 0 1 1 9 10.1v2.3a3.2 3.2 0 1 0 2.2 3v-10h2.8Z" },
];

export function LobbyFooter() {
  const { t } = useI18n();

  return (
    <footer className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-6 sm:px-8 sm:py-8">
      <div className="grid gap-8 sm:grid-cols-3">
        {t.footer.columns.map((column) => (
          <section key={column.title} aria-label={column.title}>
            <h2 className="text-base font-semibold">{column.title}</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              {column.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section aria-label={t.footer.payment} className="mt-8 border-t border-white/10 pt-6">
        <h2 className="text-base font-semibold">{t.footer.payment}</h2>
        <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-4 text-white">
          <PayWord name="True" accent="Pay" />
          <span className="text-sm font-black tracking-tight">sure PAY</span>
          <span className="text-sm font-semibold italic tracking-wide">fastPay</span>
          <span className="text-sm leading-none font-black">
            DG
            <span className="block text-[10px] font-semibold tracking-wide">Pay</span>
          </span>
        </div>
      </section>

      <div className="mt-8 flex flex-col gap-8 border-t border-white/10 pt-6 sm:flex-row sm:items-start sm:justify-between">
        <section aria-label={t.footer.follow}>
          <h2 className="text-base font-semibold">{t.footer.follow}</h2>
          <ul className="mt-4 flex gap-3">
            {socials.map((item) => (
              <li key={item.name}>
                <span
                  aria-label={item.name}
                  role="img"
                  className="grid size-10 place-items-center rounded-lg border border-white/25"
                >
                  <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                    <path d={item.path} fill="currentColor" />
                  </svg>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label={t.footer.licenses} className="sm:text-right">
          <h2 className="text-base font-semibold">{t.footer.licenses}</h2>
          <div className="mt-4 flex flex-wrap items-center gap-4 sm:justify-end">
            <span className="grid size-10 place-items-center rounded-full border border-white/70 text-[10px] font-bold">
              18+
            </span>
            <span className="text-lg font-black tracking-tight">{t.footer.fair}</span>
            <span className="text-sm font-black tracking-wide">
              OK <span className="block text-[9px] font-semibold tracking-[0.14em]">{t.footer.check}</span>
            </span>
            <span className="text-sm font-semibold tracking-wide">{t.footer.secure}</span>
          </div>
        </section>
      </div>

      <div className="mt-8 space-y-2 border-t border-white/10 pt-4 text-xs leading-5 text-white/55">
        <p>
          {fill(t.footer.legal1, { name: t.siteName }).split(t.siteName)[0]}
          <span className="text-brand">{t.siteName}</span>
          {fill(t.footer.legal1, { name: t.siteName }).split(t.siteName)[1]}
        </p>
        <p>{t.footer.legal2}</p>
        <p>{t.footer.legal3}</p>
      </div>
    </footer>
  );
}

function PayWord({ name, accent }: { name: string; accent: string }) {
  return (
    <span className="text-sm font-semibold tracking-tight">
      {name}
      <span className="font-black">{accent}</span>
    </span>
  );
}
