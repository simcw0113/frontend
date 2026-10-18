"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { BannerSlide } from "@/config/slides";

const AUTO_MS = 6500;

const themes: Record<BannerSlide["theme"], string> = {
  forest: "bg-forest text-cream",
  clay: "bg-clay text-[#fff6ee]",
  night: "bg-night text-cream",
};

type BannerCarouselProps = {
  slides: BannerSlide[];
};

export function BannerCarousel({ slides }: BannerCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const go = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches || paused || count < 2) return;

    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, AUTO_MS);

    return () => window.clearInterval(id);
  }, [count, paused]);

  function onKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    }
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="relative overflow-hidden"
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div
        className="flex motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide, slideIndex) => {
          const active = slideIndex === index;
          const Heading = slideIndex === 0 ? "h1" : "h2";

          return (
            <article
              key={slide.id}
              aria-hidden={!active}
              className={`relative min-h-[32rem] w-full shrink-0 h-[72vh] max-h-[760px] ${themes[slide.theme]}`}
            >
              <p
                aria-hidden="true"
                className="pointer-events-none absolute -right-4 bottom-8 hidden select-none font-serif text-[12rem] leading-none text-cream/10 sm:block"
              >
                {String(slideIndex + 1).padStart(2, "0")}
              </p>
              <div className="relative flex h-full max-w-6xl flex-col justify-end px-6 pb-28 pt-16 sm:px-10 lg:px-16">
                <p className="text-xs font-medium tracking-[0.22em] uppercase">
                  {slide.eyebrow}
                </p>
                <Heading className="mt-4 max-w-3xl font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                  {slide.title}
                </Heading>
                <p className="mt-5 max-w-xl text-base leading-7 text-current/80 sm:text-lg">
                  {slide.description}
                </p>
                <Link
                  href={slide.href}
                  tabIndex={active ? 0 : -1}
                  className="mt-8 inline-flex w-fit items-center rounded-full border border-current px-5 py-2.5 text-sm font-medium tracking-wide transition-colors hover:bg-cream hover:text-ink"
                >
                  {slide.cta}
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6 sm:px-10 lg:px-16">
          <div className="flex items-center gap-2">
            {slides.map((slide, slideIndex) => {
              const active = slideIndex === index;
              return (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Show slide ${slideIndex + 1}: ${slide.title}`}
                  aria-current={active ? "true" : undefined}
                  onClick={() => go(slideIndex)}
                  className={`h-2.5 rounded-full transition-all ${
                    active ? "w-8 bg-cream" : "w-2.5 bg-cream/45 hover:bg-cream/70"
                  }`}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              aria-pressed={paused}
              className="rounded-full border border-cream/40 px-3 py-2 text-xs font-medium tracking-wide text-cream hover:bg-cream/10"
            >
              {paused ? "Play" : "Pause"}
            </button>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => go(index - 1)}
              className="grid size-10 place-items-center rounded-full border border-cream/40 text-cream hover:bg-cream/10"
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => go(index + 1)}
              className="grid size-10 place-items-center rounded-full border border-cream/40 text-cream hover:bg-cream/10"
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
