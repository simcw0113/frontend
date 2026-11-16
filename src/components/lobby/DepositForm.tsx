"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useI18n } from "@/components/I18nProvider";
import { fill, htmlLang } from "@/i18n";
import { useSession } from "@/lib/useSession";
import { WalletTabs } from "@/components/lobby/WalletTabs";
import type {
  TopupActionResult,
  TopupBanklist,
  TopupBanklistResult,
  TopupCheckResult,
  TopupGroupId,
  TopupMethod,
  TopupPayResult,
  TopupPayTarget,
  TopupSubmitResult,
} from "@/lib/topup";

// Shared deposit form (tabs, bank tiles, amount, bonus, receipt, pending). Used by the
// wallet sheet (DepositSheet) and the /[lang]/deposit page. Data: the BFF routes
// /api/topup/{banklist,check,submit,cancel,pay} (lib/topup.ts). Styles: .dep-* in globals.css.
// Bank transfer uploads a receipt and waits for approval; gateway / e-wallet deposits are sent on
// to the payment gateway (goToGateway), which used to be the backend payments.redirect page.

type View = "loading" | "error" | "form" | "pending";
type FieldErrors = { bank?: string; amount?: string; receipt?: string };

export function DepositForm({
  onClose,
  onSignIn,
  showClose = false,
  wide = false,
}: {
  onClose?: () => void;
  onSignIn: () => void;
  showClose?: boolean;
  // Full /deposit page: two columns from md. The wallet sheet stays a single column.
  wide?: boolean;
}) {
  const uid = useId();
  const titleId = showClose ? "dep-title" : `${uid}-title`;

  return (
    <>
      <DepositHead titleId={titleId} onClose={showClose ? onClose : undefined} />
      <DepositBody onClose={onClose} onSignIn={onSignIn} wide={wide} />
    </>
  );
}

// Page view inside the lobby shell: title bar + a card (narrow on the phone, two columns
// from md). Guests see a sign-in
// prompt instead of the form (the sheet still opens the sign-in dialog on a 401).
export function DepositHeader() {
  const { t } = useI18n();
  return (
    <div className="promo-header">
      <h1 id="deposit-title" className="text-xl font-bold">
        {t.deposit.deposit}
      </h1>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="promo-header-art" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="6.5" width="17" height="13" rx="2" />
        <path d="M3.5 10 H20.5" />
        <path d="M8 15.5 H12" />
      </svg>
    </div>
  );
}

export function DepositPage({ onSignIn }: { onSignIn: () => void }) {
  const { t } = useI18n();
  const { user, ready } = useSession();

  return (
    <div className="dep-page mx-auto mt-6 w-full max-w-md md:max-w-5xl md:mt-4 [&_.dep-card]:!max-h-none [&_.dep-card]:!overflow-visible [&_.dep-body]:!overflow-visible [&_.dep-body]:!overscroll-auto">
      {/* Page card must not inherit the sheet's overflow/overscroll lock. Tailwind
          !utilities apply immediately (next dev does not recompile globals.css). */}
      <div className="dep-card !max-h-none !overflow-visible !rounded-2xl !border !border-white/10 !pb-0">
        {!ready ? (
          <>
            <DepositHead titleId="deposit-form-title" />
            <div className="dep-body dep-state" role="status">
              <span className="dep-spinner" aria-hidden="true" />
              <p>{t.deposit.loading}</p>
            </div>
          </>
        ) : !user ? (
          <>
            <DepositHead titleId="deposit-form-title" />
            <div className="dep-body dep-state">
              <p>{t.deposit.signInPrompt}</p>
              <button type="button" onClick={onSignIn} className="dep-primary">
                {t.auth.signIn}
              </button>
            </div>
          </>
        ) : (
          <DepositForm onSignIn={onSignIn} wide />
        )}
      </div>
    </div>
  );
}

function DepositHead({ titleId, onClose }: { titleId: string; onClose?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="dep-head">
      <h2 id={titleId} className="sr-only">
        {t.deposit.title}
      </h2>
      <WalletTabs active="deposit" onNavigate={onClose} />
      {onClose ? (
        <button type="button" aria-label={t.deposit.close} title={t.deposit.close} onClick={onClose} className="dep-close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6.5 6.5 17.5 17.5 M17.5 6.5 6.5 17.5" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

// Same-tab navigation to the gateway: a plain GET, or an auto-submitted form for POST / params.
function goToGateway(target: TopupPayTarget) {
  const entries = Object.entries(target.params);
  if (target.method === "GET" && entries.length === 0) {
    window.location.assign(target.url);
    return;
  }
  const form = document.createElement("form");
  form.method = target.method;
  form.action = target.url;
  form.style.display = "none";
  for (const [name, value] of entries) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

function initials(method: TopupMethod) {
  if (method.code) return method.code.slice(0, 3).toUpperCase();
  return method.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function BankLogo({ method }: { method: TopupMethod }) {
  const [failed, setFailed] = useState(false);
  return method.image && !failed ? (
    // eslint-disable-next-line @next/next/no-img-element -- bank logos may come from any API host
    <img src={method.image} alt="" width={40} height={40} className="dep-bank-logo" onError={() => setFailed(true)} />
  ) : (
    <span className="dep-bank-logo dep-bank-initials" aria-hidden="true">
      {initials(method)}
    </span>
  );
}

function DepositBody({ onClose, onSignIn, wide = false }: { onClose?: () => void; onSignIn: () => void; wide?: boolean }) {
  const { t, lang, locale } = useI18n();
  const id = useId();
  const [view, setView] = useState<View>("loading");
  const [data, setData] = useState<TopupBanklist | null>(null);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [groupId, setGroupId] = useState<TopupGroupId | null>(null);
  const [bankId, setBankId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [bonusId, setBonusId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | undefined>();
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const alive = useRef(true);
  const amountRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const banksRef = useRef<HTMLDivElement>(null);

  const format = (value: number) => value.toLocaleString(htmlLang(locale));

  async function post<T>(path: string, body?: FormData): Promise<T> {
    const response = await fetch(`/api/topup/${path}?lang=${encodeURIComponent(lang)}`, {
      method: "POST",
      body,
      cache: "no-store",
    });
    return (await response.json()) as T;
  }

  function applyData(next: TopupBanklist) {
    setData(next);
    const group = next.groups[0];
    setGroupId(group?.id ?? null);
    setBankId(group && group.methods.length === 1 ? group.methods[0].id : null);
  }

  function load() {
    setView("loading");
    setLoadError(undefined);
    void fetchAll();
  }

  // No state update before the first await (also runs from the mount effect).
  async function fetchAll() {
    try {
      const [check, list] = await Promise.all([post<TopupCheckResult>("check"), post<TopupBanklistResult>("banklist")]);
      if (!alive.current) return;
      if ((!check.ok && check.error === "signin") || (!list.ok && list.error === "signin")) {
        onSignIn();
        return;
      }
      if (list.ok) applyData(list.data);
      if (check.ok && check.pending) {
        setPendingMessage(undefined);
        setView("pending");
        return;
      }
      if (!list.ok) {
        setLoadError(list.message);
        setView("error");
        return;
      }
      setView("form");
    } catch {
      if (alive.current) setView("error");
    }
  }

  useEffect(() => {
    alive.current = true;
    void fetchAll();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per open (the body remounts)
  }, []);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const group = data?.groups.find((item) => item.id === groupId) ?? data?.groups[0];
  const method = group?.methods.find((item) => item.id === bankId) ?? null;
  // Only bank transfer needs a receipt (the backend's isRequiredAttachment: online transfer).
  const needsReceipt = group?.id === "bank_transfer";

  function pickGroup(next: TopupGroupId) {
    const target = data?.groups.find((item) => item.id === next);
    setGroupId(next);
    setBankId(target && target.methods.length === 1 ? target.methods[0].id : null);
    setErrors({});
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!method) next.bank = t.deposit.errBank;
    const value = Number(amount);
    if (!amount || !Number.isFinite(value) || value <= 0) next.amount = t.deposit.errAmountEmpty;
    else if (method) {
      const { min, max } = method;
      if ((min !== null && value < min) || (max !== null && max > 0 && value > max)) {
        next.amount = fill(t.deposit.errAmount, { min: format(min ?? 0), max: format(max ?? value) });
      }
    }
    if (needsReceipt && !file) next.receipt = t.deposit.errReceipt;
    return next;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setServerError(null);
    setFlash(null);
    const next = validate();
    setErrors(next);
    if (next.bank) return banksRef.current?.querySelector<HTMLElement>("button")?.focus();
    if (next.amount) return amountRef.current?.focus();
    if (next.receipt || !method || (needsReceipt && !file)) return fileRef.current?.focus();
    const form = new FormData();
    form.set("amount", amount);
    form.set("payment_id", String(method.id));
    if (bonusId) form.set("bonus_id", bonusId);
    if (needsReceipt && file) form.set("attachment", file, file.name);
    setSubmitting(true);
    let leaving = false;
    try {
      const result = await post<TopupSubmitResult>("submit", form);
      if (!alive.current) return;
      if (result.ok && !needsReceipt && result.uniqueId) {
        const body = new FormData();
        body.set("unique_id", result.uniqueId);
        const pay = await post<TopupPayResult>("pay", body);
        if (!alive.current) return;
        if (pay.ok) {
          leaving = true; // keep the button busy while the browser leaves for the gateway
          goToGateway(pay.data);
          return;
        }
        if (pay.error === "signin") return onSignIn();
        // The deposit exists but the gateway did not start: show it as pending (it can be cancelled).
        setPendingMessage(pay.message || t.deposit.failed);
        setView("pending");
      } else if (result.ok || result.error === "pending") {
        setPendingMessage(result.message);
        setView("pending");
      } else if (result.error === "signin") {
        onSignIn();
      } else {
        setServerError(result.message || t.deposit.failed);
      }
    } catch {
      if (alive.current) setServerError(t.deposit.failed);
    } finally {
      if (alive.current && !leaving) setSubmitting(false);
    }
  }

  async function cancelDeposit() {
    if (cancelling) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const result = await post<TopupActionResult>("cancel");
      if (!alive.current) return;
      if (result.ok) {
        setAmount("");
        setFile(null);
        setBonusId("");
        setErrors({});
        setServerError(null);
        setFlash(t.deposit.cancelled);
        if (data) setView("form");
        else load();
      } else if (result.error === "signin") {
        onSignIn();
      } else {
        setCancelError(result.message || t.deposit.failed);
      }
    } catch {
      if (alive.current) setCancelError(t.deposit.failed);
    } finally {
      if (alive.current) setCancelling(false);
    }
  }

  async function copyAccount(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (view === "loading") {
    return (
      <div className="dep-body dep-state" role="status">
        <span className="dep-spinner" aria-hidden="true" />
        <p>{t.deposit.loading}</p>
      </div>
    );
  }

  if (view === "error") {
    return (
      <div className="dep-body dep-state" role="alert">
        <p>{loadError || t.deposit.loadError}</p>
        <button type="button" onClick={load} className="dep-secondary">
          {t.deposit.retry}
        </button>
      </div>
    );
  }

  if (view === "pending") {
    return (
      <div className="dep-body dep-state">
        <span className="dep-pending-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5 V12 L15 14" />
          </svg>
        </span>
        <h3 className="dep-pending-title">{t.deposit.pendingTitle}</h3>
        <p className="dep-pending-text">{t.deposit.pendingBody}</p>
        {pendingMessage ? <p className="dep-pending-note">{pendingMessage}</p> : null}
        {cancelError ? (
          <p role="alert" className="dep-alert">
            {cancelError}
          </p>
        ) : null}
        <div className={`dep-actions${onClose ? "" : " !grid-cols-1"}`}>
          <button type="button" onClick={() => void cancelDeposit()} disabled={cancelling} aria-busy={cancelling || undefined} className="dep-danger">
            {cancelling ? t.deposit.cancelling : t.deposit.cancel}
          </button>
          {onClose ? (
            <button type="button" onClick={onClose} className="dep-primary">
              {t.deposit.done}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (!data || !group) {
    return (
      <div className="dep-body dep-state">
        <p>{t.deposit.empty}</p>
      </div>
    );
  }

  const quick = method?.amounts ?? [];
  const range =
    method && (method.min !== null || method.max !== null)
      ? fill(t.deposit.range, { min: format(method.min ?? 0), max: method.max ? format(method.max) : "∞" })
      : null;

  return (
    <form
      className={`dep-body${wide ? " md:grid-cols-2 md:items-start md:gap-x-8" : ""}`}
      noValidate
      onSubmit={(event) => void onSubmit(event)}
    >
      {flash ? (
        <p role="status" className={`dep-flash${wide ? " md:col-span-2" : ""}`}>
          {flash}
        </p>
      ) : null}

      <div className={wide ? "contents md:flex md:flex-col md:gap-[1.125rem]" : "contents"}>
      <fieldset className="dep-field">
        <legend className="dep-label">{t.deposit.method}</legend>
        <div className="dep-groups">
          {data.groups.map((item) => (
            <button key={item.id} type="button" aria-pressed={item.id === group.id} onClick={() => pickGroup(item.id)} className="dep-group">
              {t.deposit[item.id]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="dep-field" aria-describedby={errors.bank ? `${id}-bank-err` : undefined}>
        <legend className="dep-label">{t.deposit.bank}</legend>
        <div ref={banksRef} className="dep-banks">
          {group.methods.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === method?.id}
              onClick={() => {
                setBankId(item.id);
                setErrors((current) => ({ ...current, bank: undefined }));
              }}
              className="dep-bank"
            >
              <BankLogo method={item} />
              <span className="dep-bank-name">{item.name}</span>
            </button>
          ))}
        </div>
        {errors.bank ? (
          <p id={`${id}-bank-err`} className="dep-error">
            {errors.bank}
          </p>
        ) : null}
      </fieldset>

      {method?.account ? (
        <div className="dep-account">
          <div className="min-w-0">
            <p className="dep-account-label">{t.deposit.transferTo}</p>
            <p className="dep-account-bank">{method.name}</p>
            <p className="dep-account-no">{method.account}</p>
          </div>
          <button type="button" onClick={() => void copyAccount(method.account)} className="dep-copy" aria-live="polite">
            {copied ? t.deposit.copied : t.deposit.copy}
          </button>
        </div>
      ) : null}
      </div>

      <div className={wide ? "contents md:flex md:flex-col md:gap-[1.125rem]" : "contents"}>
      <div className="dep-field">
        <div className="dep-label-row">
          <label htmlFor={`${id}-amount`} className="dep-label">
            {t.deposit.amount}
          </label>
          {range ? (
            <span id={`${id}-range`} className="dep-hint">
              {range}
            </span>
          ) : null}
        </div>
        <input
          ref={amountRef}
          id={`${id}-amount`}
          inputMode="decimal"
          autoComplete="off"
          placeholder={t.deposit.amountPlaceholder}
          value={amount}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={[range ? `${id}-range` : "", errors.amount ? `${id}-amount-err` : ""].filter(Boolean).join(" ") || undefined}
          onChange={(event) => {
            const next = event.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
            setAmount(next);
            if (errors.amount) setErrors((current) => ({ ...current, amount: undefined }));
          }}
          className="dep-input"
        />
        {quick.length > 0 ? (
          <div className="dep-chips">
            {quick.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={amount === String(value)}
                onClick={() => {
                  setAmount(String(value));
                  setErrors((current) => ({ ...current, amount: undefined }));
                }}
                className="dep-chip"
              >
                {format(value)}
              </button>
            ))}
          </div>
        ) : null}
        {errors.amount ? (
          <p id={`${id}-amount-err`} className="dep-error">
            {errors.amount}
          </p>
        ) : null}
      </div>

      {data.promotions.length > 0 ? (
        <div className="dep-field">
          <label htmlFor={`${id}-bonus`} className="dep-label">
            {t.deposit.bonus}
          </label>
          <select id={`${id}-bonus`} value={bonusId} onChange={(event) => setBonusId(event.target.value)} className="dep-input dep-select">
            <option value="">{t.deposit.noBonus}</option>
            {data.promotions.map((promo) => (
              <option key={promo.id} value={String(promo.id)}>
                {promo.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {needsReceipt ? (
      <div className="dep-field">
        <span className="dep-label" id={`${id}-receipt-label`}>
          {t.deposit.receipt}
        </span>
        <input
          ref={fileRef}
          id={`${id}-receipt`}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-labelledby={`${id}-receipt-label`}
          aria-describedby={errors.receipt ? `${id}-receipt-err` : `${id}-receipt-hint`}
          onChange={(event) => {
            const picked = event.target.files?.[0] ?? null;
            event.target.value = ""; // the same file can be picked again after Remove
            if (!picked) return;
            if (!picked.type.startsWith("image/")) {
              setErrors((current) => ({ ...current, receipt: t.deposit.errImage }));
              return;
            }
            setFile(picked);
            setErrors((current) => ({ ...current, receipt: undefined }));
          }}
        />
        {file && preview ? (
          <div className="dep-preview">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
            <img src={preview} alt="" />
            <span className="dep-preview-name">{file.name}</span>
            <button
              type="button"
              aria-label={t.deposit.receiptRemove}
              title={t.deposit.receiptRemove}
              onClick={() => {
                setFile(null);
                requestAnimationFrame(() => fileRef.current?.focus());
              }}
              className="dep-preview-remove"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6.5 6.5 17.5 17.5 M17.5 6.5 6.5 17.5" />
              </svg>
            </button>
          </div>
        ) : (
          <label htmlFor={`${id}-receipt`} className={`dep-drop${errors.receipt ? " is-invalid" : ""}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 16 V5 M7.5 9.5 12 5 16.5 9.5" />
              <path d="M4.5 15.5 V19 H19.5 V15.5" />
            </svg>
            <span className="dep-drop-title">{t.deposit.receiptPick}</span>
            <span id={`${id}-receipt-hint`} className="dep-hint">
              {t.deposit.receiptHint}
            </span>
          </label>
        )}
        {errors.receipt ? (
          <p id={`${id}-receipt-err`} className="dep-error">
            {errors.receipt}
          </p>
        ) : null}
      </div>
      ) : null}

      {data.notice ? (
        <div className="dep-notice">
          <p className="dep-notice-title">{t.deposit.notice}</p>
          <p className="dep-notice-text">{data.notice}</p>
        </div>
      ) : null}

      {serverError ? (
        <p role="alert" className="dep-alert">
          {serverError}
        </p>
      ) : null}

      <button type="submit" disabled={submitting} aria-busy={submitting || undefined} className="dep-primary dep-submit">
        {submitting ? <span className="dep-spinner dep-spinner-sm" aria-hidden="true" /> : null}
        {submitting ? t.deposit.submitting : t.deposit.submit}
      </button>
      </div>
    </form>
  );
}
