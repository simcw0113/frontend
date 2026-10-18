"use client";

import { useState, type ReactNode } from "react";
import { useI18n } from "@/components/I18nProvider";
import { EyeIcon, EyeOffIcon } from "@/components/auth/icons";

// No transitions or animations on purpose: fields only change state instantly.
export const fieldClass =
  "block h-12 w-full rounded-xl border bg-lobby-deep px-4 text-[0.9375rem] text-ink outline-0 placeholder:text-muted focus:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export const borderFor = (error?: string | null) => (error ? "border-danger" : "border-field");

export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  busy?: boolean;
};

export function TextField({
  id,
  name,
  type = "text",
  label,
  value,
  onChange,
  error,
  busy,
  autoComplete,
  inputMode,
  maxLength,
  autofocus,
}: TextFieldProps & {
  name: string;
  type?: "text" | "email" | "tel";
  autoComplete: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  maxLength?: number;
  autofocus?: boolean;
}) {
  return (
    <Field id={id} label={label} error={error}>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={maxLength}
        placeholder={label}
        value={value}
        readOnly={busy}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        data-autofocus={autofocus ? "" : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldClass} ${borderFor(error)}`}
      />
    </Field>
  );
}

export function IdentifierField(props: TextFieldProps) {
  return <TextField {...props} name="username" autoComplete="username" autofocus />;
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  busy,
  autoComplete = "current-password",
}: TextFieldProps & { autoComplete?: "current-password" | "new-password" }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  return (
    <Field id={id} label={label} error={error}>
      <div className="relative">
        <input
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={label}
          value={value}
          readOnly={busy}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={`${fieldClass} pr-14 ${borderFor(error)}`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
          aria-pressed={visible}
          className="absolute inset-y-0 right-1.5 my-auto grid size-10 place-items-center rounded-lg text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand"
        >
          {visible ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
        </button>
      </div>
    </Field>
  );
}
