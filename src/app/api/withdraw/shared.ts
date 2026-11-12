import { NextResponse } from "next/server";
import { withdrawStatus, type WithdrawError } from "@/lib/withdraw";

type Result = { ok: true } | WithdrawError | { ok: boolean };

// Shared by the /api/withdraw/* routes: language from ?lang= (the URL slug) and a
// no-store JSON answer. Errors keep { ok: false, error, message? }; sign-in is
// { error: "signin" } with 401, matching /api/topup/*.
export function withdrawLang(request: Request): string {
  return new URL(request.url).searchParams.get("lang") || "en";
}

export function withdrawJson(result: Result) {
  return NextResponse.json(result, { status: withdrawStatus(result), headers: { "Cache-Control": "no-store" } });
}
