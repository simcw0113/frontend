"use client";

import { AuthLayout, SHOW_BRAND_PANEL } from "@/components/auth/AuthLayout";
import { useI18n } from "@/components/I18nProvider";

// /login page: same card as the pop-up, centred on the page.
export function LoginScreen() {
  const { href } = useI18n();

  return (
    <main id="content" className="flex min-h-full w-full flex-col items-center justify-center p-4 sm:p-8">
      <div className={`w-full ${SHOW_BRAND_PANEL ? "max-w-[62rem]" : "max-w-[27.5rem]"}`}>
        <AuthLayout titleId="login-title" heading="h1" active closeHref={href("/")} />
      </div>
    </main>
  );
}
