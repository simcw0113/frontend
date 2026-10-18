const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const siteConfig = {
  name: "Game Lobby",
  description: "Casino games and sports markets together in one lobby.",
  url: siteUrl.replace(/\/$/, ""),
};

export const apiConfig = {
  baseUrl: (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, ""),
  loginPath: "/auth/login",
  registerPath: "/auth/register",
};
