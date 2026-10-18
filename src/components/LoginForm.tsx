"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { ApiError } from "@/lib/api";
import { loginWithPassword } from "@/lib/auth";
import { animate, reduceMotion } from "@/lib/motion";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!formRef.current || reduceMotion()) return;
    animate(formRef.current, {
      opacity: [0, 1],
      y: [18, 0],
      duration: 560,
      ease: "outCubic",
    });
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await loginWithPassword(email, password);
      router.push("/");
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
    <form ref={formRef} onSubmit={onSubmit} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          {t.auth.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-ink outline-none focus:border-brand"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          {t.auth.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-ink outline-none focus:border-brand"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-brand">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-lobby disabled:opacity-60"
      >
        {pending ? t.auth.pending : t.auth.signIn}
      </button>
    </form>
  );
}
