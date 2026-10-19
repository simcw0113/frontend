"use client";

import { useEffect, useRef, useState } from "react";

// Whether a scroll container really overflows horizontally right now, so a strip can be a
// keyboard-focusable scroll region only while it scrolls. Updated from a ResizeObserver
// callback, never synchronously in an effect.
export function useScrollable<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setScrolls(element.scrollWidth > element.clientWidth + 1));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, scrolls] as const;
}
