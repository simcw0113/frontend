import { Poppins } from "next/font/google";

// Poppins only on the missions page (Kickwin uses it site-wide). Applied to the
// header and page wrappers in Missions.tsx — not in layout or globals.css.
export const missionsPoppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
