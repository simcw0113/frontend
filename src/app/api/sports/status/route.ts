import { NextResponse } from "next/server";
import { getSportsProductStatus } from "@/lib/sportsLaunch";

// Public: product status for /{lang}/sports is checked before the sign-in gate.
// GET ?lang=en -> { state, publicCode? }
export async function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get("lang")?.trim() || "en";
  const result = await getSportsProductStatus(lang);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
