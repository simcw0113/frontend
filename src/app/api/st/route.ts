import { NextResponse } from "next/server";
import { buildMeta } from "@/lib/buildMeta.generated";

// Unlisted build stamp. 404 unless the query matches. Not linked from the lobby.
const MARK = "q8v3n";

const PRIVATE = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
};

export async function GET(request: Request) {
  const mark = new URL(request.url).searchParams.get("m");
  if (mark !== MARK) {
    return new NextResponse(null, { status: 404, headers: PRIVATE });
  }

  const body = `${buildMeta.sha}\ncommitted ${buildMeta.committed}\nbuilt ${buildMeta.built}\n`;
  return new NextResponse(body, {
    status: 200,
    headers: { ...PRIVATE, "Content-Type": "text/plain; charset=utf-8" },
  });
}
