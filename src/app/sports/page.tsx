import type { Metadata } from "next";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";

export const metadata: Metadata = {
  title: "Trending sports",
  description: "All trending sports markets.",
  alternates: { canonical: "/sports" },
};

export default function SportsPage() {
  return <LobbyScreen focus="sports" />;
}
