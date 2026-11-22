import { Poppins } from "next/font/google";

// Poppins on the missions page and the home Top wins row (Kickwin uses it site-wide).
// Applied via className on those wrappers — not in layout or globals.css.
export const missionsPoppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});
