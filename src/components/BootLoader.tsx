"use client";

import { useEffect, useState } from "react";
import { LogoLoader } from "@/components/LogoLoader";

const HOLD_MS = 1500;
const FADE_MS = 500;

export function BootLoader() {
  const [phase, setPhase] = useState<"show" | "leave" | "gone">("show");

  useEffect(() => {
    const shell = document.getElementById("app-shell");
    shell?.setAttribute("inert", "");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wait = reduced ? 0 : Math.max(0, HOLD_MS - performance.now());
    const fade = reduced ? 0 : FADE_MS;
    const hide = window.setTimeout(() => setPhase("leave"), wait);
    const done = window.setTimeout(() => {
      shell?.removeAttribute("inert");
      setPhase("gone");
    }, wait + fade);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(done);
      shell?.removeAttribute("inert");
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div className={`loader-overlay${phase === "leave" ? " is-leaving" : ""}`}>
      <LogoLoader />
    </div>
  );
}
