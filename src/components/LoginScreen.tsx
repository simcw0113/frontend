"use client";

import { AuthLayout, SHOW_BRAND_PANEL } from "@/components/auth/AuthLayout";

// /login page: same card as the pop-up, centred on the page.
export function LoginScreen() {
  return (
    <main id="content" className="flex min-h-full w-full flex-col items-center justify-center p-4 sm:p-8">
      <div className={`w-full ${SHOW_BRAND_PANEL ? "max-w-[62rem]" : "max-w-[27.5rem]"}`}>
        <AuthLayout titleId="login-title" heading="h1" active closeHref="/" />
      </div>
    </main>
  );
}
