import { NextResponse } from "next/server";
import { apiConfig } from "@/config/site";
import { ApiError, apiJson, isApiStatusFailure, readApiMessage } from "@/lib/api";
import { getAuthTokenFromCookie } from "@/lib/authCookie";
import { lobbyLocale } from "@/lib/lobbyApi";
import { mediaUrl } from "@/lib/promotions";

// GET  /api/missions?locale=en -> backend POST /task_list. Token optional (signed out = no progress).
//      { ongoing: Mission[], finished: Mission[], my_complete: Mission[] } (fields: Mission in components/lobby/Missions.tsx).
//      Image paths become absolute.
// POST /api/missions { taskId, locale } -> backend POST /claim_task_reward. Needs the cookie token.

const noStore = { "Cache-Control": "no-store" };

async function backendPost(path: string, token: string | null, body: Record<string, unknown>) {
  const headers: Record<string, string> = { "Content-Type": "application/json", "country-id": apiConfig.lobbyCountryId || "1" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return apiJson(path, { method: "POST", auth: false, headers, body: JSON.stringify(body), cache: "no-store" });
}

const str = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

function clean(item: Record<string, unknown>) {
  const image = str(item.image);
  const gameImage = str(item.game_image);
  return {
    ...item,
    image: image && mediaUrl(image),
    game_image: gameImage && mediaUrl(gameImage),
  };
}

export async function GET(request: Request) {
  const token = await getAuthTokenFromCookie();
  const locale = lobbyLocale(new URL(request.url).searchParams.get("locale") ?? "en");
  try {
    const payload = await backendPost(apiConfig.taskListPath, token ?? null, { locale });
    const data = (payload as { data?: Record<string, unknown> } | null)?.data;
    if (isApiStatusFailure(payload) || !data) {
      return NextResponse.json({ error: true, message: readApiMessage(payload) }, { status: 502, headers: noStore });
    }
    const list = (key: string) => (Array.isArray(data[key]) ? (data[key] as Record<string, unknown>[]).map(clean) : []);
    return NextResponse.json(
      { ongoing: list("ongoing"), finished: list("finished"), my_complete: list("my_complete") },
      { headers: noStore },
    );
  } catch {
    return NextResponse.json({ error: true }, { status: 502, headers: noStore });
  }
}

export async function POST(request: Request) {
  const token = await getAuthTokenFromCookie();
  if (!token) return NextResponse.json({ ok: false, error: "signin" }, { status: 401, headers: noStore });
  const raw = (await request.json().catch(() => null)) as { taskId?: unknown; locale?: unknown } | null;
  const taskId = Number(raw?.taskId);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400, headers: noStore });
  }
  const locale = lobbyLocale(typeof raw?.locale === "string" ? raw.locale : "en");
  try {
    const payload = await backendPost(apiConfig.claimTaskPath, token, { task_id: taskId, locale });
    const message = readApiMessage(payload);
    if (isApiStatusFailure(payload)) return NextResponse.json({ ok: false, message }, { status: 400, headers: noStore });
    return NextResponse.json({ ok: true, message }, { headers: noStore });
  } catch (error) {
    const message = error instanceof ApiError ? error.message : null;
    return NextResponse.json({ ok: false, message }, { status: 502, headers: noStore });
  }
}
