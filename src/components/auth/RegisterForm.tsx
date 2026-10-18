"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import { PasswordField, TextField, fieldClass, borderFor } from "@/components/auth/AuthFields";
import { ChevronIcon } from "@/components/auth/icons";
import { PhoneField } from "@/components/auth/PhoneField";
import { useI18n } from "@/components/I18nProvider";
import { countries, DEFAULT_COUNTRY } from "@/config/countries";
import { ApiError } from "@/lib/api";
import { registerAccount } from "@/lib/auth";

type Method = "email" | "phone";
type Errors = { email?: boolean; phone?: boolean; password?: boolean; agree?: boolean };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_MIN = 6;
const PHONE_MAX = 12;
const PASSWORD_MIN = 8;

export function RegisterForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const { t } = useI18n();
  const [method, setMethod] = useState<Method>("email");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [referralOpen, setReferralOpen] = useState(false);
  const [referral, setReferral] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const tabRefs = useRef<Record<Method, HTMLButtonElement | null>>({ email: null, phone: null });

  const clear = (key: keyof Errors) => {
    if (errors[key]) setErrors((current) => ({ ...current, [key]: false }));
  };

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const order: Method[] = ["email", "phone"];
    const index = order.indexOf(method);
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % order.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + order.length) % order.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = order.length - 1;
    else return;
    event.preventDefault();
    setMethod(order[next]);
    tabRefs.current[order[next]]?.focus();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const next: Errors = {
      email: method === "email" && !EMAIL_PATTERN.test(email.trim()),
      phone: method === "phone" && (phone.length < PHONE_MIN || phone.length > PHONE_MAX),
      password: password.length < PASSWORD_MIN,
      agree: !agree,
    };
    setErrors(next);
    setError(null);
    const first = (["email", "phone", "password", "agree"] as const).find((key) => next[key]);
    if (first) {
      const name = first === "agree" ? "agree" : first;
      formRef.current?.querySelector<HTMLElement>(`[name="${name}"]`)?.focus();
      return;
    }

    setPending(true);
    try {
      await registerAccount({
        method,
        email: email.trim(),
        countryDial: countries.find((item) => item.iso === country)?.dial ?? "",
        phone,
        password,
        referral: referral.trim(),
      });
      setPassword("");
      if (onSuccess) onSuccess();
      else router.push("/");
    } catch (cause) {
      if (cause instanceof ApiError && cause.code) setError(t.errors[cause.code]);
      else if (cause instanceof ApiError) setError(cause.message);
      else setError(t.errors.unreachable);
    } finally {
      setPending(false);
    }
  }

  const tabs: { id: Method; label: string }[] = [
    { id: "email", label: t.auth.emailAddress },
    { id: "phone", label: t.auth.phoneNumber },
  ];

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-busy={pending} className="space-y-4">
      <div
        role="tablist"
        aria-label={t.auth.registerWith}
        className="grid grid-cols-2 gap-1 rounded-xl bg-lobby p-1"
      >
        {tabs.map((tab) => {
          const selected = method === tab.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[tab.id] = node;
              }}
              type="button"
              role="tab"
              id={`register-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls="register-tabpanel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setMethod(tab.id)}
              onKeyDown={onTabKeyDown}
              className={`h-10 rounded-lg px-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                selected ? "bg-lobby-soft text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="register-tabpanel" aria-labelledby={`register-tab-${method}`}>
        {method === "email" ? (
          <TextField
            id="register-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            label={t.auth.emailAddress}
            value={email}
            onChange={(value) => {
              setEmail(value);
              clear("email");
            }}
            error={errors.email ? t.auth.errorEmail : null}
            busy={pending}
            autofocus
          />
        ) : (
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
        )}
      </div>

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
