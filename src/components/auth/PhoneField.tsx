"use client";

import { useI18n } from "@/components/I18nProvider";
import { borderFor, fieldClass } from "@/components/auth/AuthFields";
import { ChevronIcon } from "@/components/auth/icons";
import { countries, flagEmoji } from "@/config/countries";

// Native <select> for the country code (accessible, keyboard and mobile
// friendly) next to a digits-only national number input.
export function PhoneField({
  id,
  label,
  country,
  onCountry,
  value,
  onChange,
  error,
  busy,
  autofocus,
}: {
  id: string;
  label: string;
  country: string;
  onCountry: (iso: string) => void;
  value: string;
  onChange: (digits: string) => void;
  error?: string | null;
  busy?: boolean;
  autofocus?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative w-[7.5rem] shrink-0">
          <select
            name="country"
            aria-label={t.auth.countryCode}
            value={country}
            disabled={busy}
            onChange={(event) => onCountry(event.target.value)}
            className={`${fieldClass} ${borderFor(error)} cursor-pointer appearance-none pr-8 pl-3`}
          >
            {countries.map((item) => (
              <option key={item.iso} value={item.iso}>
                {`${flagEmoji(item.iso)} ${item.iso} +${item.dial}`}
              </option>
            ))}
          </select>
          <ChevronIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted" />
        </div>
        <input
          id={id}
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={15}
          placeholder={label}
          value={value}
          readOnly={busy}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          data-autofocus={autofocus ? "" : undefined}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
          className={`${fieldClass} ${borderFor(error)} min-w-0 flex-1`}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
