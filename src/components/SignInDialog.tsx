"use client";

import type { AuthView } from "@/components/auth/AuthFormPanel";
import { AuthModal } from "@/components/auth/AuthModal";

// Kept as the lobby's entry point to the login/register pop-up.
export function SignInDialog({
  open,
  onClose,
  initialView,
}: {
  open: boolean;
  onClose: () => void;
  initialView?: AuthView;
}) {
  return <AuthModal open={open} onClose={onClose} initialView={initialView} />;
}
