import { redirect } from "next/navigation";
import { defaultCasinoCategory } from "@/config/categories";

// Old URL: /{lang}/games now lives at /{lang}/casino/{category}.
export default async function GamesRedirect({ params }: PageProps<"/[lang]/games">) {
  const { lang } = await params;
  redirect(`/${lang}/casino/${defaultCasinoCategory.slug}`);
}
