import { NextResponse, type NextRequest } from "next/server";
import { findCasinoCategory } from "@/config/categories";
import { defaultSlug, isSlug, localeCookie, localizedPath, negotiate } from "@/i18n/routing";

// Sends unprefixed URLs (/, /games, ...) to the visitor's language:
// saved NEXT_LOCALE cookie, then Accept-Language, then English.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];

  if (isSlug(first)) {
    // Unknown casino category: answer 404 right away. (The page also calls
    // notFound(), but with partial prerendering the first hit would stream a 200.)
    const [, , section, category] = pathname.split("/");
    if (section === "casino" && category && !findCasinoCategory(category)) {
      return NextResponse.rewrite(new URL(`/${first}/not-found`, request.url));
    }
    const response = NextResponse.next();
    if (request.cookies.get(localeCookie)?.value !== first) {
      response.cookies.set(localeCookie, first, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    return response;
  }

  const saved = request.cookies.get(localeCookie)?.value;
  const slug = isSlug(saved) ? saved : (negotiate(request.headers.get("accept-language")) ?? defaultSlug);
  const url = request.nextUrl.clone();
  url.pathname = localizedPath(slug, pathname);
  return NextResponse.redirect(url, 307);
}

export const config = {
  // Skip _next, api and anything with a file extension (robots.txt, sitemap.xml,
  // favicon.ico, icon.svg, images, ...).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
