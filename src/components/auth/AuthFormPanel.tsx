"use client";

import type { Ref } from "react";
import { BenefitChips, LoginPrompt, RegisterPrompt, SocialLogin } from "@/components/auth/AuthExtras";
import { BrandLogo } from "@/components/auth/BrandLogo";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { useI18n } from "@/components/I18nProvider";
import { LoginForm } from "@/components/LoginForm";

export type AuthView = "login" | "register";

// Right half of the auth card. Shows the Login or the Register view; the left
// BrandPanel is untouched by view changes. Below md it also carries the compact
// brand header, because the BrandPanel is hidden there.
export function AuthFormPanel({
  titleId,
  heading: Heading,
  view,
  onViewChange,
  onSuccess,
  contentRef,
  compactLogoOnly,
}: {
  titleId: string;
  heading: "h1" | "h2";
  view: AuthView;
  onViewChange: (view: AuthView) => void;
  onSuccess?: () => void;
  /** Wraps everything that transitions on a view switch (not the logo). */
  contentRef?: Ref<HTMLDivElement>;
  /** true: the logo only shows below md (the BrandPanel carries it above). */
  compactLogoOnly?: boolean;
}) {
  const { t } = useI18n();
  const register = view === "register";

  return (
    <div className="@container flex flex-col justify-center bg-lobby-deep px-7 py-6 sm:px-8">
      <BrandLogo className={`mb-4 pr-14 ${compactLogoOnly ? "md:hidden" : ""}`} />
      <div ref={contentRef}>
        <Heading id={titleId} className="mb-4 text-2xl font-bold tracking-tight">
          {register ? t.auth.register : t.auth.login}
        </Heading>
        {register ? <RegisterForm key="register" onSuccess={onSuccess} /> : <LoginForm key="login" onSuccess={onSuccess} />}
        <div className="mt-5 space-y-5">
          {register ? (
            <LoginPrompt onSwitch={() => onViewChange("login")} />
          ) : (
            <>
              <RegisterPrompt onSwitch={() => onViewChange("register")} />
              <BenefitChips />
            </>
          )}
          <SocialLogin onSuccess={onSuccess} />
        </div>
      </div>
    </div>
  );
}
