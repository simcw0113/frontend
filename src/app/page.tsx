import type { Metadata } from "next";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

export default function Home() {
  return <LobbyScreen />;
}
