"use client";

import { useI18n } from "@/components/I18nProvider";
import { providers, type Provider } from "@/config/providers";

// Heading + "All" reset on one line, then one horizontally scrollable row of
// pills. Scrollbar hidden; pills are real buttons, so the row scrolls with the
// keyboard (Tab moves focus and brings the pill into view) and snaps.
export function ProviderRow({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { t } = useI18n();

  return (
    <section aria-labelledby="provider-heading" className="mt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="provider-heading" className="text-lg font-semibold">
          {t.lobby.providers}
        </h2>
        <button
          type="button"
          aria-pressed={selected === null}
          onClick={() => onSelect(null)}
          className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
            selected === null ? "text-brand" : "text-muted hover:text-white"
          }`}
        >
          {t.lobby.all}
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <div className="provider-scroll -m-1 flex snap-x snap-proximity scroll-px-1 gap-2 overflow-x-auto p-1 no-scrollbar">
        {providers.map((provider) => (
          <ProviderPill
            key={provider.id}
            provider={provider}
            active={selected === provider.id}
            onSelect={() => onSelect(selected === provider.id ? null : provider.id)}
          />
        ))}
      </div>
    </section>
  );
}

function ProviderPill({
  provider,
  active,
  onSelect,
}: {
  provider: Provider;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={`inline-flex h-10 shrink-0 snap-start items-center gap-2 rounded-full border pr-4 pl-1.5 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
        active
          ? "border-brand bg-brand/15 text-white"
          : "border-white/10 bg-white/[0.07] text-white hover:border-brand/60 hover:bg-white/10"
      }`}
    >
      <span
        aria-hidden="true"
        className="grid size-7 place-items-center rounded-full text-[0.6875rem] leading-none font-black tracking-tight"
        style={{ color: provider.accent, backgroundColor: `color-mix(in srgb, ${provider.accent} 20%, #081a1f)` }}
      >
        {provider.mark}
      </span>
      {provider.name}
    </button>
  );
}
