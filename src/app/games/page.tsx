import type { Metadata } from "next";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";

export const metadata: Metadata = {
  title: "Trending games",
  description: "All trending casino games.",
  alternates: { canonical: "/games" },
};

export default function GamesPage() {
  return <LobbyScreen focus="games" />;
}
