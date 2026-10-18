export type BannerSlide = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  theme: "forest" | "clay" | "night";
};

export const bannerSlides: BannerSlide[] = [
  {
    id: "season",
    eyebrow: "This season",
    title: "Quiet things, chosen carefully",
    description:
      "A rotating edit of what is worth a closer look. Start here, then wander.",
    href: "#featured",
    cta: "Explore the edit",
    theme: "forest",
  },
  {
    id: "new",
    eyebrow: "Just in",
    title: "New arrivals, without the rush",
    description:
      "Fresh pieces land here first. Take your time. Nothing on this banner expires in a countdown.",
    href: "#featured",
    cta: "See what is new",
    theme: "clay",
  },
  {
    id: "keep",
    eyebrow: "Made to keep",
    title: "Objects with a longer life",
    description:
      "Materials and details that still feel right after the first week.",
    href: "#featured",
    cta: "Browse the collection",
    theme: "night",
  },
];
