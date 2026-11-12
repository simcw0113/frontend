import { NextResponse } from "next/server";
import { topupStatus, type TopupError } from "@/lib/topup";

type Result = { ok: true } | TopupError;

// Shared by the /api/topup/* routes: language from ?lang= (the URL slug: en | cn | bm | ...) and a
// no-store JSON answer. Errors keep the shape { ok: false, error, message? }; the sign-in
// error is also { error: "signin" } with 401, as /api/lobby/launch does.
export function topupLang(request: Request): string {
  return new URL(request.url).searchParams.get("lang") || "en";
}

export function topupJson(result: Result) {
  return NextResponse.json(result, { status: topupStatus(result), headers: { "Cache-Control": "no-store" } });
}
