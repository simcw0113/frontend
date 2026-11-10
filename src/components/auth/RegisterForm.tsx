"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PasswordField, TextField, fieldClass, borderFor } from "@/components/auth/AuthFields";
import { ChevronIcon } from "@/components/auth/icons";
import { PhoneField } from "@/components/auth/PhoneField";
import { useI18n } from "@/components/I18nProvider";
import { countries, DEFAULT_COUNTRY } from "@/config/countries";
import { ApiError } from "@/lib/api";
import { registerAccount } from "@/lib/auth";

type Errors = {
  username?: boolean;
  password?: boolean;
  confirm?: boolean;
  phone?: boolean;
  realName?: boolean;
  agree?: boolean;
};

// Length and character set match the backend member create rules
// (username /^[a-zA-Z0-9_-]+$/, 6–20). The lookaheads are frontend-only:
// a username must include at least one letter and one digit so a pure
// number cannot be registered and later treated as a phone at login.
// full_name is letters/spaces/apostrophes; password min 6 on the API (kept at 8 here).
const USERNAME_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9_-]{6,20}$/;
const REAL_NAME_PATTERN = /^[A-Za-z]+(?:[ '][A-Za-z]+)*$/;
const PHONE_MIN = 6;
const PHONE_MAX = 12;
const PASSWORD_MIN = 8;

const FOCUS_NAME: Record<keyof Errors, string> = {
  username: "username",
  password: "password",
  confirm: "confirm",
  phone: "phone",
  realName: "realName",
  agree: "agree",
};

export function RegisterForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const { t, href } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [realName, setRealName] = useState("");
  const [referralOpen, setReferralOpen] = useState(false);
  const [referral, setReferral] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const clear = (key: keyof Errors) => {
    if (errors[key]) setErrors((current) => ({ ...current, [key]: false }));
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const next: Errors = {
      username: !USERNAME_PATTERN.test(username.trim()),
      password: password.length < PASSWORD_MIN,
      confirm: confirm !== password,
      phone: phone.length < PHONE_MIN || phone.length > PHONE_MAX,
      realName: !REAL_NAME_PATTERN.test(realName.trim()),
      agree: !agree,
    };
    setErrors(next);
    setError(null);
    const first = (Object.keys(FOCUS_NAME) as (keyof Errors)[]).find((key) => next[key]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${FOCUS_NAME[first]}"]`)?.focus();
      return;
    }

    setPending(true);
    try {
      await registerAccount({
        username: username.trim(),
        password,
        countryDial: countries.find((item) => item.iso === country)?.dial ?? "",
        phone,
        realName: realName.trim(),
        referral: referral.trim(),
      });
      setPassword("");
      setConfirm("");
      if (onSuccess) onSuccess();
      else router.push(href("/"));
    } catch (cause) {
      if (cause instanceof ApiError && cause.code) setError(t.errors[cause.code]);
      else if (cause instanceof ApiError) setError(cause.message);
      else setError(t.errors.unreachable);
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-busy={pending} className="space-y-4">
      <TextField
        id="register-username"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        maxLength={20}
        label={t.auth.username}
        value={username}
        onChange={(value) => {
          setUsername(value);
          clear("username");
        }}
        error={errors.username ? t.auth.errorUsername : null}
        busy={pending}
        autofocus
      />

      <PasswordField
        id="register-password"
        label={t.auth.password}
        autoComplete="new-password"
        value={password}
        onChange={(value) => {
          setPassword(value);
          clear("password");
        }}
        error={errors.password ? t.auth.errorPasswordShort : null}
        busy={pending}
      />

      <PasswordField
        id="register-confirm"
        name="confirm"
        label={t.auth.confirmPassword}
        autoComplete="new-password"
        value={confirm}
        onChange={(value) => {
          setConfirm(value);
          clear("confirm");
        }}
        error={errors.confirm ? t.auth.errorConfirm : null}
        busy={pending}
      />

      <PhoneField
        id="register-phone"
        label={t.auth.phoneNumber}
        country={country}
        onCountry={setCountry}
        value={phone}
        onChange={(value) => {
          setPhone(value);
          clear("phone");
        }}
        error={errors.phone ? t.auth.errorPhone : null}
        busy={pending}
      />

      <TextField
        id="register-real-name"
        name="realName"
        autoComplete="name"
        autoCapitalize="words"
        label={t.auth.realName}
        value={realName}
        onChange={(value) => {
          setRealName(value);
          clear("realName");
        }}
        error={errors.realName ? t.auth.errorRealName : null}
        busy={pending}
      />

      <div>
        <button
          type="button"
          aria-expanded={referralOpen}
          aria-controls="register-referral"
          onClick={() => setReferralOpen((open) => !open)}
          className="inline-flex items-center gap-2 rounded text-sm font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          {t.auth.referralToggle}
          <ChevronIcon className={`size-4 ${referralOpen ? "rotate-180" : ""}`} />
        </button>
        {referralOpen ? (
          <div id="register-referral" className="mt-3">
            <label htmlFor="register-referral-input" className="sr-only">
              {t.auth.referralLabel}
            </label>
            <input
              id="register-referral-input"
              name="referral"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={32}
              placeholder={t.auth.referralLabel}
              value={referral}
              readOnly={pending}
              onChange={(event) => setReferral(event.target.value.replace(/[^A-Za-z0-9_-]/g, ""))}
              className={`${fieldClass} ${borderFor()}`}
            />
          </div>
        ) : null}
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-2.5 text-[0.8125rem] leading-snug select-none">
          <input
            type="checkbox"
            name="agree"
            checked={agree}
            aria-invalid={errors.agree ? true : undefined}
            aria-describedby={errors.agree ? "register-agree-error" : undefined}
            onChange={(event) => {
              setAgree(event.target.checked);
              clear("agree");
            }}
            className={`auth-check mt-0.5 ${errors.agree ? "is-invalid" : ""}`}
          />
          {/* TODO(API): link "User Agreement" once the page exists. */}
          <span>{t.auth.agree}</span>
        </label>
        {errors.agree ? (
          <p id="register-agree-error" className="mt-1.5 text-[0.8125rem] text-danger">
            {t.auth.errorAgree}
          </p>
        ) : null}
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
            {t.auth.registering}
          </>
        ) : (
          t.auth.register
        )}
      </button>
    </form>
  );
}
