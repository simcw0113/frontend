import type { Metadata } from "next";
import { LoginScreen } from "@/components/LoginScreen";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to continue.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginScreen />;
}
