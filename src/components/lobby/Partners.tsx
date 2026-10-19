"use client";

import { use, useEffect, useId } from "react";
import { useI18n } from "@/components/I18nProvider";
import type { Partner, PartnerMark } from "@/config/partners";
import type { PartnersResult } from "@/lib/partners";
import { useScrollable } from "@/lib/useScrollable";

// Ping-pong auto-scroll of the logo row: slow, eased at both ends.
const SPEED = 36; // px per second
const END_PAUSE_MS = 1200;
const EASE_ZONE = 90; // px before an end over which the speed eases down
const USER_PAUSE_MS = 4000; // after the visitor scrolls the row by hand

// "Our Partners": a heading and a panel with one row of logo tiles (home page only, after the
// last game row). The row slides to the left until the last tile is in view, then back, forever
// (usePingPong). It only moves when the tiles overflow the panel, pauses on hover, focus and
// when the tab is hidden, and stays a plain scroll-snap row with reduced motion. Layout is in
// globals.css (.partners-*). Hidden when empty or on error.
export function Partners({ promise }: { promise: Promise<PartnersResult> }) {
  const { t } = useI18n();
  const result = use(promise);
  const [scroller, scrolls] = useScrollable<HTMLDivElement>();
  usePingPong(scroller);
  const headingId = useId();
  if (result.error || result.partners.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="partners">
      <div className="mb-3 flex min-h-7 items-center">
        <h2 id={headingId} className="text-lg font-semibold">
          {t.partners.title}
        </h2>
      </div>
      <div className="partners-panel">
        <div
          ref={scroller}
          className="partners-scroll"
          {...(scrolls ? { role: "region", "aria-label": t.partners.title, tabIndex: 0 } : {})}
        >
          <ul className="partners-list">
            {result.partners.map((partner) => (
              <li key={partner.id} className="partners-tile">
                <Logo partner={partner} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// Moves the row's scrollLeft back and forth with requestAnimationFrame (no timers, no
// dependencies). The distance is read from the real overflow every frame, so it follows any
// resize and does nothing when everything fits. Manual scrolling keeps working: the row
// pauses while hovered or focused, and for a few seconds after the visitor scrolls it.
function usePingPong(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let running = false;

    let position = 0;
    let direction = 1;
    let lastSet = 0;
    let last = 0;
    let waitUntil = 0;
    let hovered = false;
    let focused = false;
    let userUntil = 0;

    const onEnter = () => (hovered = true);
    const onLeave = () => (hovered = false);
    const onFocusIn = () => (focused = true);
    const onFocusOut = () => (focused = false);
    const onUser = () => (userUntil = performance.now() + USER_PAUSE_MS);

    function tick(now: number) {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(now - last, 50); // a hidden tab must not cause a jump
      last = now;
      const max = element!.scrollWidth - element!.clientWidth;
      if (max <= 1) return; // everything fits: stay still
      if (Math.abs(element!.scrollLeft - lastSet) > 2) {
        // moved by the visitor (wheel, touch, keys, drag)
        position = element!.scrollLeft;
        userUntil = now + USER_PAUSE_MS;
      }
      if (hovered || focused || now < userUntil || document.hidden) {
        position = element!.scrollLeft;
        lastSet = position;
        return;
      }
      if (now < waitUntil) return;
      const toEnd = direction > 0 ? max - position : position;
      const ease = 0.2 + 0.8 * Math.min(1, Math.max(0, toEnd) / EASE_ZONE);
      position += direction * SPEED * ease * (dt / 1000);
      if (position >= max || position <= 0) {
        position = Math.min(max, Math.max(0, position));
        direction = -direction;
        waitUntil = now + END_PAUSE_MS;
      }
      element!.scrollLeft = position;
      lastSet = element!.scrollLeft;
    }

    function start() {
      if (running || media.matches) return;
      running = true;
      element!.dataset.auto = "";
      position = element!.scrollLeft;
      lastSet = position;
      last = performance.now();
      waitUntil = last + END_PAUSE_MS;
      frame = requestAnimationFrame(tick);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(frame);
      delete element!.dataset.auto;
    }
    const onMedia = () => (media.matches ? stop() : start());

    element.addEventListener("mouseenter", onEnter);
    element.addEventListener("mouseleave", onLeave);
    element.addEventListener("focusin", onFocusIn);
    element.addEventListener("focusout", onFocusOut);
    element.addEventListener("wheel", onUser, { passive: true });
    element.addEventListener("touchstart", onUser, { passive: true });
    media.addEventListener("change", onMedia);
    start();
    return () => {
      stop();
      element.removeEventListener("mouseenter", onEnter);
      element.removeEventListener("mouseleave", onLeave);
      element.removeEventListener("focusin", onFocusIn);
      element.removeEventListener("focusout", onFocusOut);
      element.removeEventListener("wheel", onUser);
      element.removeEventListener("touchstart", onUser);
      media.removeEventListener("change", onMedia);
    };
  }, [ref]);
}

// Matches the real section's height so the footer does not jump when the data arrives.
export function PartnersSkeleton() {
  return (
    <div aria-hidden="true" data-skeleton="partners">
      <div className="mb-3 flex min-h-7 items-center">
        <div className="h-5 w-36 rounded bg-white/5 motion-safe:animate-pulse" />
      </div>
      <div className="partners-panel">
        <div className="partners-scroll">
          <div className="h-16 rounded-xl bg-white/5 motion-safe:animate-pulse" />
        </div>
      </div>
    </div>
  );
}

const STYLES: Record<PartnerMark["style"], string> = {
  bold: "font-extrabold tracking-tight",
  italic: "font-black italic tracking-tight",
  caps: "text-[0.8125rem] font-bold tracking-[0.14em] uppercase",
  light: "font-light tracking-wide",
  mono: "font-mono font-bold tracking-tight",
};

// The image when `logo` is set, otherwise a placeholder wordmark. The name is the accessible
// name either way.
function Logo({ partner }: { partner: Partner }) {
  if (partner.logo) {
    // eslint-disable-next-line @next/next/no-img-element -- partner logos come from an unknown host
    return <img src={partner.logo} alt={partner.name} loading="lazy" className="max-h-10 max-w-full object-contain" />;
  }
  const mark: PartnerMark = partner.mark ?? { text: partner.name, color: "#0f282f", style: "bold", badge: "circle" };
  return (
    <span role="img" aria-label={partner.name} className="flex max-w-full items-center gap-1.5" style={{ color: mark.color }}>
      {mark.badge ? (
        <span
          aria-hidden="true"
          className={`grid size-6 shrink-0 place-items-center text-xs font-black text-white ${
            mark.badge === "circle" ? "rounded-full" : "rounded-md"
          }`}
          style={{ background: mark.color }}
        >
          {partner.name.charAt(0)}
        </span>
      ) : null}
      <span aria-hidden="true" className={`truncate text-base ${STYLES[mark.style]}`}>
        {mark.text}
      </span>
    </span>
  );
}
