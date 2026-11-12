"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import type { Provider } from "@/config/providers";

// Products that do not list games in our lobby (GET /config `type`):
//   1 Web: one button; opens the provider's own lobby in a new tab.
//   2 App: game account (username + password), iOS / Android downloads, and
//          an open-game button on phones.
//   4 Deep Link: downloads and an enter-game button.
// Everything comes from POST /opengame `{ provider }` through /api/lobby/launch.
// The call opens the player's game account, so it only runs on a click.

type Launch = {
  kind: "redirect" | "app" | "deeplink";
  url?: string;
  username?: string;
  password?: string;
  iosUrl?: string;
  androidUrl?: string;
  balance?: string;
};

type LaunchError = { error: "signin" | "failed"; message?: string };

const BUTTON =
  "inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60";
const PRIMARY = `${BUTTON} bg-brand text-white hover:brightness-110`;
const SECONDARY = `${BUTTON} border border-white/15 bg-white/5 hover:bg-white/10`;

export function ProviderLaunch({
  provider,
  signedIn,
  onSignIn,
}: {
  provider: Provider;
  signedIn: boolean;
  onSignIn: () => void;
}) {
  const { lang, t } = useI18n();
  const copy = t.providerLaunch;
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [launch, setLaunch] = useState<Launch | null>(null);
  const [message, setMessage] = useState("");
  const [mobile, setMobile] = useState(false);
  const [copied, setCopied] = useState<"username" | "password" | null>(null);
  const type = provider.type ?? 1;

  useEffect(() => {
    setMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
  }, []);

  // A new provider starts from its button again.
  useEffect(() => {
    setState("idle");
    setLaunch(null);
    setMessage("");
  }, [provider.id]);

  async function requestLaunch(): Promise<Launch | null> {
    setState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/lobby/launch", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ publicCode: provider.id, lang }),
      });
      const payload = (await response.json().catch(() => ({ error: "failed" }))) as Launch | LaunchError;
      if ("error" in payload) {
        if (payload.error === "signin") {
          setState("idle");
          onSignIn();
          return null;
        }
        setMessage(payload.message || copy.failed);
        setState("error");
        return null;
      }
      setLaunch(payload);
      setState("ready");
      return payload;
    } catch {
      setMessage(copy.failed);
      setState("error");
      return null;
    }
  }

  // Open the tab inside the click so the browser does not block it, then point it at the game.
  async function openInNewTab(existing?: string) {
    if (!signedIn) return onSignIn();
    if (existing) {
      window.open(existing, "_blank", "noopener");
      return;
    }
    const tab = window.open("about:blank", "_blank");
    const result = await requestLaunch();
    if (result?.url) {
      if (tab) tab.location.href = result.url;
      else window.location.href = result.url;
    } else {
      tab?.close();
    }
  }

  async function copyValue(field: "username" | "password", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked; the value is still on screen */
    }
  }

  const loading = state === "loading";

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8" aria-label={provider.name}>
      <div className="flex items-center gap-4">
        {provider.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={provider.image} alt="" className="size-14 rounded-xl bg-white/5 object-contain p-1" />
        ) : (
          <span
            className="grid size-14 place-items-center rounded-xl text-lg font-bold text-white"
            style={{ background: provider.accent }}
            aria-hidden="true"
          >
            {provider.mark}
          </span>
        )}
        <div>
          <h2 className="text-lg font-semibold">{provider.name}</h2>
          <p className="text-sm text-muted">
            {type === 2 ? copy.appHint : type === 4 ? copy.deeplinkHint : copy.webHint}
          </p>
        </div>
      </div>

      {type === 2 ? (
        <AppPanel />
      ) : type === 4 ? (
        <DeeplinkPanel />
      ) : (
        <div className="mt-6">
          <button type="button" className={PRIMARY} disabled={loading} onClick={() => openInNewTab()}>
            {loading ? copy.opening : signedIn ? copy.play : copy.signIn}
          </button>
        </div>
      )}

      {state === "error" ? (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {message}
        </p>
      ) : null}
    </section>
  );

  function Downloads() {
    if (!launch?.iosUrl && !launch?.androidUrl) return null;
    return (
      <div className="flex flex-wrap gap-3">
        {launch.iosUrl ? (
          <a href={launch.iosUrl} target="_blank" rel="noopener noreferrer" className={SECONDARY}>
            {copy.downloadIos}
          </a>
        ) : null}
        {launch.androidUrl ? (
          <a href={launch.androidUrl} target="_blank" rel="noopener noreferrer" className={SECONDARY}>
            {copy.downloadAndroid}
          </a>
        ) : null}
      </div>
    );
  }

  function AppPanel() {
    if (state !== "ready" || !launch) {
      return (
        <div className="mt-6">
          <button
            type="button"
            className={PRIMARY}
            disabled={loading}
            onClick={() => (signedIn ? requestLaunch() : onSignIn())}
          >
            {loading ? copy.opening : signedIn ? copy.getAccount : copy.signIn}
          </button>
        </div>
      );
    }
    // No launch URL for App products yet: on a phone, open the store link for that OS.
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const appLink = launch.url || (ios ? launch.iosUrl : launch.androidUrl) || launch.androidUrl || launch.iosUrl;
    return (
      <div className="mt-6 space-y-5">
        <dl className="grid gap-3 sm:max-w-md">
          <Field label={copy.username} value={launch.username} field="username" />
          <Field label={copy.password} value={launch.password} field="password" />
          {launch.balance != null ? (
            <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
              <dt className="text-sm text-muted">{copy.balance}</dt>
              <dd className="font-semibold tabular-nums">{launch.balance}</dd>
            </div>
          ) : null}
        </dl>
        <Downloads />
        {mobile ? (
          appLink ? (
            <a href={appLink} className={PRIMARY}>
              {copy.openGame}
            </a>
          ) : (
            <button type="button" className={PRIMARY} disabled title={copy.noLink}>
              {copy.openGame}
            </button>
          )
        ) : null}
      </div>
    );
  }

  function DeeplinkPanel() {
    return (
      <div className="mt-6 space-y-5">
        {state === "ready" ? <Downloads /> : null}
        <button
          type="button"
          className={PRIMARY}
          disabled={loading}
          onClick={() => (launch?.url ? (window.location.href = launch.url) : openInNewTab())}
        >
          {loading ? copy.opening : signedIn ? copy.enterGame : copy.signIn}
        </button>
      </div>
    );
  }

  function Field({ label, value, field }: { label: string; value?: string; field: "username" | "password" }) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-4 py-3">
        <dt className="text-sm text-muted">{label}</dt>
        <dd className="flex items-center gap-3">
          <span className="font-mono font-semibold">{value || "-"}</span>
          {value ? (
            <button
              type="button"
              onClick={() => copyValue(field, value)}
              className="rounded-md border border-white/15 px-2 py-1 text-xs hover:bg-white/10"
            >
              {copied === field ? copy.copied : copy.copy}
            </button>
          ) : null}
        </dd>
      </div>
    );
  }
}
