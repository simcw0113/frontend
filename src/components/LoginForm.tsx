"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { IdentifierField, PasswordField } from "@/components/auth/AuthFields";
import { useI18n } from "@/components/I18nProvider";
import { ApiError } from "@/lib/api";
import { loginWithPassword } from "@/lib/auth";

export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const { t } = useI18n();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: boolean; password?: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const trimmed = identifier.trim();
    const errors = { identifier: !trimmed, password: !password };
    setFieldErrors(errors);
    setError(null);
    if (errors.identifier || errors.password) {
      const first = errors.identifier ? "username" : "password";
      formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setPending(true);
    try {
      await loginWithPassword({ identifier: trimmed, password, remember });
      setPassword("");
      if (onSuccess) onSuccess();
      else router.push("/");
    } catch (cause) {
      if (cause instanceof ApiError && cause.code) {
        setError(t.errors[cause.code]);
      } else if (cause instanceof ApiError) {
        setError(cause.message);
      } else {
        setError(t.errors.unreachable);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-busy={pending} className="space-y-4">
      <div className="space-y-4">
        <IdentifierField
          id="login-identifier"
          label={t.auth.identifier}
          value={identifier}
          onChange={(value) => {
            setIdentifier(value);
            if (fieldErrors.identifier) setFieldErrors((current) => ({ ...current, identifier: false }));
          }}
          error={fieldErrors.identifier ? t.auth.errorIdentifier : null}
          busy={pending}
        />
        <PasswordField
          id="login-password"
          label={t.auth.password}
          value={password}
          onChange={(value) => {
            setPassword(value);
            if (fieldErrors.password) setFieldErrors((current) => ({ ...current, password: false }));
          }}
          error={fieldErrors.password ? t.auth.errorPassword : null}
          busy={pending}
        />
      </div>

      <div className="flex items-center justify-between gap-4 text-sm">
        <label className="flex cursor-pointer items-center gap-2.5 select-none">
          <input
            type="checkbox"
            name="remember"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="auth-check"
          />
          <span>{t.auth.remember}</span>
        </label>
        {/* TODO(API): wire to the password-reset flow. */}
        <button
          type="button"
          onClick={() => {}}
          className="rounded font-medium text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          {t.auth.forgot}
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        aria-disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-brand text-[0.9375rem] font-bold text-lobby hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white aria-disabled:cursor-wait aria-disabled:opacity-80"
      >
        {pending ? (
          <>
            <span className="auth-spinner" aria-hidden="true" />
            {t.auth.pending}
          </>
        ) : (
          t.auth.login
        )}
      </button>
    </form>
  );
}
