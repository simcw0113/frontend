import { BrandLoader } from "@/components/BrandLoader";

// Route fallback while a page segment loads (e.g. a page that was not prefetched). Fades in
// after a short delay, so fast navigations and the lobby view transitions never show it.
export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-lobby">
      <BrandLoader />
    </div>
  );
}
