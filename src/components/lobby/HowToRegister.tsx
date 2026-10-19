"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { registerSteps, type RegisterStep } from "@/config/howToRegister";
import { animate, reduceMotion } from "@/lib/motion";

// "How to Register": a slim bar with the four steps (home page only, between Top wins and
// the search bar; the caller adds the spacing). Layout lives in globals.css (.howto-*) and
// follows the bar's own width: one row with connectors, 4 compact columns, or a horizontal
// scroll strip. Step 1 is the only button. The content is fully visible in the server HTML;
// when the bar first scrolls into view it fades in once (200 ms, skipped with reduced motion).
export function HowToRegister({ onRegister }: { onRegister: () => void }) {
  const { t } = useI18n();
  const bar = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  // The strip is a keyboard-focusable scroll region only while it really scrolls.
  const [scrolls, setScrolls] = useState(false);

  useEffect(() => {
    const element = bar.current;
    if (!element || reduceMotion() || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        animate(element, { opacity: [0, 1], duration: 200, ease: "outQuad" });
      },
      { threshold: 0.25 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = scroller.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setScrolls(element.scrollWidth > element.clientWidth + 1));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="howto">
      <section ref={bar} aria-labelledby="how-to-register-title" className="howto-bar">
        <h2 id="how-to-register-title" className="howto-label">
          {t.howTo.title}
        </h2>
        <div
          ref={scroller}
          className="howto-scroll"
          {...(scrolls ? { role: "region", "aria-label": t.howTo.title, tabIndex: 0 } : {})}
        >
          <ol className="howto-steps">
            {registerSteps.map((step) => {
              const text = t.howTo.steps[step.key];
              return (
                <li key={step.key} className="howto-step">
                  <div className="howto-body">
                    <span className="howto-icon" aria-hidden="true">
                      <StepIcon id={step.icon} />
                    </span>
                    <div className="howto-text">
                      <h3 className="howto-title">
                        {"action" in step && step.action === "register" ? (
                          <button type="button" onClick={onRegister} className="howto-action">
                            {text.title}
                          </button>
                        ) : (
                          text.title
                        )}
                      </h3>
                      <p className="howto-desc">{text.text}</p>
                    </div>
                  </div>
                  <span className="howto-link" aria-hidden="true" />
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </div>
  );
}

// Simple line icons (a soft cyan fill under a cyan outline), drawn on a 48 grid and shown small.
function StepIcon({ id }: { id: RegisterStep["icon"] }) {
  const common = {
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const soft = "currentColor";
  switch (id) {
    case "user-plus":
      return (
        <svg {...common}>
          <circle cx="20" cy="16" r="7" fill={soft} fillOpacity=".22" />
          <path d="M6 40c0-7.7 6.3-13 14-13s14 5.3 14 13Z" fill={soft} fillOpacity=".22" />
          <path d="M39 14v12M33 20h12" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <rect x="6" y="14" width="34" height="26" rx="5" fill={soft} fillOpacity=".22" />
          <path d="M6 20c0-3.3 2.7-6 6-6h22" />
          <path d="M40 24h-7a4 4 0 0 0 0 8h7" />
          <circle cx="36" cy="9" r="5" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...common}>
          <path d="M16 8h16v10a8 8 0 0 1-16 0Z" fill={soft} fillOpacity=".22" />
          <path d="M16 11H9c0 6 3 9 7 9M32 11h7c0 6-3 9-7 9" />
          <path d="M24 26v8M17 40h14M19 34h10" />
        </svg>
      );
    case "gift":
      return (
        <svg {...common}>
          <rect x="7" y="20" width="34" height="20" rx="3" fill={soft} fillOpacity=".22" />
          <rect x="5" y="14" width="38" height="7" rx="2" />
          <path d="M24 14v26" />
          <path d="M24 14c-3-6-11-6-11-1.5C13 15 17 14 24 14Zm0 0c3-6 11-6 11-1.5C35 15 31 14 24 14Z" />
        </svg>
      );
  }
}
