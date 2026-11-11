export type BannerSlide = {
  id: string;
  imageUrl: string;
  mobileUrl?: string;
  href?: string;
};

// Shown only when GET /config `data.banners` is empty or the request fails.
export const bannerSlides: BannerSlide[] = [
  {
    id: "banner-1",
    imageUrl:
      "https://www.bk8best18.asia/public/html/banner/compress/banner20261013045317590_EN_MY.webp",
  },
  {
    id: "banner-2",
    imageUrl:
      "https://www.bk8best18.asia/public/html/banner/compress/banner20260923105515809_EN_MY.webp",
  },
];
