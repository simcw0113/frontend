"use client";

import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { useI18n } from "@/components/I18nProvider";

export function LoginScreen() {
  const { t } = useI18n();

  return (
    <main id="content" className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="text-sm text-muted hover:text-brand">
        {t.auth.back}
      </Link>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">{t.auth.signIn}</h1>
      <p className="mt-3 text-sm leading-6 text-muted">{t.auth.intro}</p>
      <LoginForm />
    </main>
  );
}
