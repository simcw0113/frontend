"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/components/I18nProvider";
import { fill, htmlLang, uiLocale } from "@/i18n";
import { useSession } from "@/lib/useSession";
import type {
  MemberBank,
  WithdrawActionResult,
  WithdrawBank,
  WithdrawBanklist,
  WithdrawBanklistResult,
  WithdrawLimit,
  WithdrawLimitResult,
} from "@/lib/withdraw";
import { WalletTabs } from "@/components/lobby/WalletTabs";

// Withdrawal form for /[lang]/withdraw. Data: BFF /api/withdraw/{banklist,limit,submit}
// (lib/withdraw.ts). Styles: reused .dep-* in globals.css. The bank list is shown as
// soon as it loads; withdraw_limit is slower (recalls game wallets) and does not
// block the bank fields.

type FieldErrors = { bank?: string; accountName?: string; accountNumber?: string; amount?: string };

export function WithdrawHeader() {
  const { t } = useI18n();
  return (
    <div className="promo-header">
      <h1 id="withdraw-title" className="text-xl font-bold">
        {t.deposit.withdraw}
      </h1>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="promo-header-art" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="6.5" width="17" height="13" rx="2" />
        <path d="M3.5 10 H20.5" />
        <path d="M12 13.5 V17.5 M10 15.5 H14" />
      </svg>
    </div>
  );
}

export function WithdrawPage({ onSignIn }: { onSignIn: () => void }) {
  const { t } = useI18n();
  const { user, ready } = useSession();

  return (
    <div className="dep-page mx-auto mt-6 w-full max-w-md md:max-w-5xl md:mt-4 [&_.dep-card]:!max-h-none [&_.dep-card]:!overflow-visible [&_.dep-body]:!overflow-visible [&_.dep-body]:!overscroll-auto">
      {/* Same page-card override as /deposit so sheet overflow rules cannot trap scroll
          (Tailwind !utilities apply immediately; next dev does not recompile globals.css). */}
      <div className="dep-card !max-h-none !overflow-visible !rounded-2xl !border !border-white/10 !pb-0">
        {!ready ? (
          <>
            <WithdrawHead titleId="withdraw-form-title" />
            <div className="dep-body dep-state" role="status">
              <span className="dep-spinner" aria-hidden="true" />
              <p>{t.withdraw.loading}</p>
            </div>
          </>
        ) : !user ? (
          <>
            <WithdrawHead titleId="withdraw-form-title" />
            <div className="dep-body dep-state">
              <p>{t.withdraw.signInPrompt}</p>
              <button type="button" onClick={onSignIn} className="dep-primary">
                {t.auth.signIn}
              </button>
            </div>
          </>
        ) : (
          <WithdrawForm onSignIn={onSignIn} />
        )}
      </div>
    </div>
  );
}

function WithdrawHead({ titleId }: { titleId: string }) {
  const { t } = useI18n();
  return (
    <div className="dep-head">
      <h2 id={titleId} className="sr-only">
        {t.deposit.withdraw}
      </h2>
      <WalletTabs active="withdraw" />
    </div>
  );
}

export function WithdrawForm({ onSignIn }: { onSignIn: () => void }) {
  const { lang, t } = useI18n();
  const locale = uiLocale(lang);
  const titleId = useId();
  const [banks, setBanks] = useState<WithdrawBanklist | null>(null);
  const [banksError, setBanksError] = useState<string | undefined>();
  const [limit, setLimit] = useState<WithdrawLimit | null>(null);
  const [limitError, setLimitError] = useState<string | undefined>();
  const [limitLoading, setLimitLoading] = useState(true);
  const [savedKey, setSavedKey] = useState<string | "new" | null>(null);
  const [bankId, setBankId] = useState<number | null>(null);
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const alive = useRef(true);
  const amountRef = useRef<HTMLInputElement>(null);

  const format = (value: number) => value.toLocaleString(htmlLang(locale), { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  async function post<T>(path: string, body?: BodyInit, contentType?: string): Promise<T> {
    const headers: HeadersInit = contentType ? { "Content-Type": contentType } : {};
    const response = await fetch(`/api/withdraw/${path}?lang=${encodeURIComponent(lang)}`, {
      method: "POST",
      body,
      headers,
      cache: "no-store",
    });
    return (await response.json()) as T;
  }

  function applyLimit(next: WithdrawLimit) {
    setLimit(next);
    if (next.force_withdraw_all) setAmount(next.amount);
  }

  async function loadBanks() {
    setBanksError(undefined);
    try {
      const list = await post<WithdrawBanklistResult>("banklist");
      if (!alive.current) return;
      if (!list.ok && list.error === "signin") {
        onSignIn();
        return;
      }
      if (!list.ok) {
        setBanksError(list.message || t.withdraw.loadError);
        return;
      }
      setBanks(list.data);
      if (list.data.member_bank.length > 0) {
        pickSaved(list.data.member_bank[0], list.data.withdraw_bank, 0);
      } else if (list.data.withdraw_bank.length === 1) {
        setSavedKey("new");
        setBankId(list.data.withdraw_bank[0].id);
      } else {
        setSavedKey("new");
      }
    } catch {
      if (alive.current) setBanksError(t.withdraw.loadError);
    }
  }

  async function loadLimit() {
    setLimitLoading(true);
    setLimitError(undefined);
    try {
      const result = await post<WithdrawLimitResult>("limit");
      if (!alive.current) return;
      if (!result.ok && result.error === "signin") {
        onSignIn();
        return;
      }
      if (!result.ok) {
        setLimitError(result.message || t.withdraw.loadError);
        setLimit(null);
        return;
      }
      applyLimit(result.data);
    } catch {
      if (alive.current) setLimitError(t.withdraw.loadError);
    } finally {
      if (alive.current) setLimitLoading(false);
    }
  }

  useEffect(() => {
    alive.current = true;
    void loadBanks();
    void loadLimit();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, []);

  function memberKey(bank: MemberBank, index: number) {
    return `${bank.bank}|${bank.account}|${index}`;
  }

  function pickSaved(bank: MemberBank, list: WithdrawBank[], index: number) {
    setSavedKey(memberKey(bank, index));
    const match = list.find((item) => item.name.toLowerCase() === bank.bank.toLowerCase());
    setBankId(match?.id ?? null);
    setAccountName(bank.name);
    setAccountNumber(bank.account);
    setErrors({});
  }

  function pickNew() {
    setSavedKey("new");
    setBankId(banks?.withdraw_bank.length === 1 ? banks.withdraw_bank[0].id : null);
    setAccountName("");
    setAccountNumber("");
    setErrors({});
  }

  function pickBank(id: number) {
    setBankId(id);
    if (savedKey !== "new") setSavedKey("new");
    setErrors((prev) => ({ ...prev, bank: undefined }));
  }

  const selectedBank: WithdrawBank | null = banks?.withdraw_bank.find((item) => item.id === bankId) ?? null;

  const blockReason = useMemo(() => {
    if (!limit) return null;
    if (limit.daily_count_remaining !== null && limit.daily_count_remaining <= 0) return t.withdraw.errDailyCount;
    const value = Number(amount);
    if (!amount || !Number.isFinite(value)) return null;
    if (limit.min_amount !== null && value < limit.min_amount) {
      return limit.force_withdraw_all
        ? fill(t.withdraw.blockedMin, { min: format(limit.min_amount) })
        : fill(t.withdraw.errAmount, { min: format(limit.min_amount), max: format(limit.max_amount ?? value) });
    }
    if (limit.max_amount !== null && value > limit.max_amount) {
      return fill(t.withdraw.errAmount, { min: format(limit.min_amount ?? 0), max: format(limit.max_amount) });
    }
    if (limit.daily_amount_remaining !== null && value > limit.daily_amount_remaining) {
      return fill(t.withdraw.errDailyAmount, { remaining: format(limit.daily_amount_remaining) });
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- format uses locale
  }, [limit, amount, t]);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!selectedBank) next.bank = t.withdraw.errBank;
    if (!accountName.trim()) next.accountName = t.withdraw.errAccountName;
    if (!accountNumber.trim()) next.accountNumber = t.withdraw.errAccountNumber;
    const value = Number(amount);
    if (!amount || !Number.isFinite(value) || value <= 0) next.amount = t.withdraw.errAmountEmpty;
    return next;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || limitLoading || !limit || blockReason) return;
    setServerError(null);
    const next = validate();
    setErrors(next);
    if (next.bank || next.accountName || next.accountNumber || next.amount) {
      if (next.amount) amountRef.current?.focus();
      return;
    }
    if (!selectedBank) return;
    setSubmitting(true);
    try {
      const result = await post<WithdrawActionResult>(
        "submit",
        JSON.stringify({
          amount,
          bank_name: selectedBank.name,
          account_number: accountNumber.trim(),
          account_name: accountName.trim(),
        }),
        "application/json",
      );
      if (!alive.current) return;
      if (!result.ok && result.error === "signin") {
        onSignIn();
        return;
      }
      if (!result.ok) {
        setServerError(result.message || t.withdraw.failed);
        return;
      }
      setSuccess(result.message || t.withdraw.success);
    } catch {
      if (alive.current) setServerError(t.withdraw.failed);
    } finally {
      if (alive.current) setSubmitting(false);
    }
  }

  if (!banks && !banksError) {
    return (
      <>
        <WithdrawHead titleId={titleId} />
        <div className="dep-body dep-state" role="status">
          <span className="dep-spinner" aria-hidden="true" />
          <p>{t.withdraw.loading}</p>
        </div>
      </>
    );
  }

  if (banksError && !banks) {
    return (
      <>
        <WithdrawHead titleId={titleId} />
        <div className="dep-body dep-state">
          <p>{banksError}</p>
          <button type="button" onClick={() => void loadBanks()} className="dep-secondary">
            {t.withdraw.retry}
          </button>
        </div>
      </>
    );
  }

  if (success) {
    return (
      <>
        <WithdrawHead titleId={titleId} />
        <div className="dep-body dep-state">
          <p className="dep-pending-title">{success}</p>
          <button type="button" onClick={() => setSuccess(null)} className="dep-primary">
            {t.deposit.done}
          </button>
        </div>
      </>
    );
  }

  const locked = Boolean(limit?.force_withdraw_all);
  const submitDisabled = submitting || limitLoading || !limit || Boolean(blockReason);

  return (
    <>
      <WithdrawHead titleId={titleId} />
      <form
        className="dep-body md:grid-cols-2 md:items-start md:gap-x-8"
        onSubmit={onSubmit}
        noValidate
      >
        <div className="contents md:col-start-2 md:flex md:flex-col md:gap-[1.125rem]">
        <div className="dep-field">
          <div className="dep-label-row">
            <span className="dep-label">{t.withdraw.available}</span>
            {limitLoading ? (
              <span className="dep-hint">{t.withdraw.loadingLimit}</span>
            ) : limit ? (
              <span className="text-sm font-extrabold text-white">{format(limit.amountValue)}</span>
            ) : null}
          </div>
          {limit && limit.fee !== 0 ? <p className="dep-hint">{fill(t.withdraw.fee, { fee: format(limit.fee) })}</p> : null}
          {limit && (limit.daily_count_remaining !== null || limit.daily_amount_remaining !== null) ? (
            <p className="dep-hint">
              {fill(t.withdraw.dailyRemaining, {
                count: limit.daily_count_remaining ?? "—",
                amount: limit.daily_amount_remaining !== null ? format(limit.daily_amount_remaining) : "—",
              })}
            </p>
          ) : null}
        </div>

        <div className="dep-field">
          <div className="dep-label-row">
            <label className="dep-label" htmlFor="withdraw-amount">
              {t.withdraw.amount}
            </label>
            {limit && (limit.min_amount !== null || limit.max_amount !== null) ? (
              <span className="dep-hint">
                {fill(t.withdraw.range, {
                  min: limit.min_amount !== null ? format(limit.min_amount) : "—",
                  max: limit.max_amount !== null ? format(limit.max_amount) : "—",
                })}
              </span>
            ) : null}
          </div>
          <input
            ref={amountRef}
            id="withdraw-amount"
            className="dep-input"
            inputMode="decimal"
            autoComplete="off"
            placeholder={t.withdraw.amountPlaceholder}
            value={amount}
            readOnly={locked || limitLoading}
            aria-invalid={Boolean(errors.amount || (blockReason && amount)) || undefined}
            aria-describedby={blockReason ? "withdraw-block" : undefined}
            onChange={(event) => {
              if (locked) return;
              setAmount(event.target.value.trim());
              setErrors((prev) => ({ ...prev, amount: undefined }));
            }}
          />
          {locked && limit ? <p className="dep-hint">{t.withdraw.amountLocked}</p> : null}
          {errors.amount ? <p className="dep-error">{errors.amount}</p> : null}
          {limitError ? (
            <div>
              <p className="dep-error">{limitError}</p>
              <button type="button" onClick={() => void loadLimit()} className="dep-secondary mt-2">
                {t.withdraw.retry}
              </button>
            </div>
          ) : null}
        </div>
        </div>

        <div className="contents md:col-start-1 md:row-start-1 md:row-span-2 md:flex md:flex-col md:gap-[1.125rem]">
        {banks && banks.member_bank.length > 0 ? (
          <fieldset className="dep-field">
            <legend className="dep-label">{t.withdraw.savedBanks}</legend>
            <div className="dep-banks">
              {banks.member_bank.map((item, index) => {
                const key = memberKey(item, index);
                return (
                  <button
                    key={key}
                    type="button"
                    className="dep-bank"
                    aria-pressed={savedKey === key}
                    onClick={() => pickSaved(item, banks.withdraw_bank, index)}
                  >
                    <span className="dep-bank-initials dep-bank-logo">{initials(item.bank || item.name)}</span>
                    <span className="dep-bank-name">{item.bank || t.withdraw.bank}</span>
                    <span className="dep-hint break-all">{item.account}</span>
                  </button>
                );
              })}
              <button type="button" className="dep-bank" aria-pressed={savedKey === "new"} onClick={pickNew}>
                <span className="dep-bank-initials dep-bank-logo">+</span>
                <span className="dep-bank-name">{t.withdraw.newAccount}</span>
              </button>
            </div>
          </fieldset>
        ) : null}

        <fieldset className="dep-field">
          <legend className="dep-label">{t.withdraw.chooseBank}</legend>
          {banks && banks.withdraw_bank.length === 0 ? (
            <p className="dep-hint">{t.withdraw.emptyBanks}</p>
          ) : (
            <div className="dep-banks">
              {banks?.withdraw_bank.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="dep-bank"
                  aria-pressed={bankId === item.id}
                  onClick={() => pickBank(item.id)}
                >
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" className="dep-bank-logo" />
                  ) : (
                    <span className="dep-bank-initials dep-bank-logo">{initials(item.name)}</span>
                  )}
                  <span className="dep-bank-name">{item.name}</span>
                </button>
              ))}
            </div>
          )}
          {errors.bank ? <p className="dep-error">{errors.bank}</p> : null}
        </fieldset>
        </div>

        <div className="contents md:col-start-2 md:flex md:flex-col md:gap-[1.125rem]">
        <div className="dep-field">
          <label className="dep-label" htmlFor="withdraw-account-name">
            {t.withdraw.accountName}
          </label>
          <input
            id="withdraw-account-name"
            className="dep-input"
            autoComplete="name"
            placeholder={t.withdraw.accountNamePlaceholder}
            value={accountName}
            aria-invalid={Boolean(errors.accountName) || undefined}
            onChange={(event) => {
              setAccountName(event.target.value);
              setErrors((prev) => ({ ...prev, accountName: undefined }));
            }}
          />
          {errors.accountName ? <p className="dep-error">{errors.accountName}</p> : null}
        </div>

        <div className="dep-field">
          <label className="dep-label" htmlFor="withdraw-account-number">
            {t.withdraw.accountNumber}
          </label>
          <input
            id="withdraw-account-number"
            className="dep-input"
            autoComplete="off"
            inputMode="numeric"
            placeholder={t.withdraw.accountNumberPlaceholder}
            value={accountNumber}
            aria-invalid={Boolean(errors.accountNumber) || undefined}
            onChange={(event) => {
              setAccountNumber(event.target.value);
              setErrors((prev) => ({ ...prev, accountNumber: undefined }));
            }}
          />
          {errors.accountNumber ? <p className="dep-error">{errors.accountNumber}</p> : null}
        </div>

        {blockReason ? (
          <p id="withdraw-block" role="alert" className="dep-alert">
            {blockReason}
          </p>
        ) : null}

        {serverError ? (
          <p role="alert" className="dep-alert">
            {serverError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitDisabled}
          aria-busy={submitting || undefined}
          className={`dep-primary dep-submit ${submitDisabled && !submitting ? "disabled:!cursor-not-allowed" : ""}`}
        >
          {submitting ? <span className="dep-spinner dep-spinner-sm" aria-hidden="true" /> : null}
          {submitting ? t.withdraw.submitting : t.withdraw.submit}
        </button>
        </div>
      </form>
    </>
  );
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return parts
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}
