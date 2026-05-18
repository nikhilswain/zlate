import { getSupabaseAdmin } from "@/lib/supabase";
import { checkRateLimit, getCloudflareEnv } from "@/lib/cloudflareEnv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function POST(request: Request) {
  try {
    const env = await getCloudflareEnv();
    const ip = getClientIp(request);
    if (!(await checkRateLimit(env.PAIRING_LIMIT, ip))) {
      return Response.json(
        { error: "Too many attempts. Wait a minute and try again." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    let body: { code?: unknown };
    try {
      body = (await request.json()) as { code?: unknown };
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const rawCode = body.code;
    if (typeof rawCode !== "string" || rawCode.length === 0) {
      return Response.json({ error: "Missing code." }, { status: 400 });
    }
    const code = rawCode.trim().toUpperCase().replace(/[\s-]/g, "");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("pairing_codes")
      .select("account_id, expires_at, used_at")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      return Response.json(
        { error: "Lookup failed.", detail: error.message },
        { status: 500 },
      );
    }
    if (!data) {
      return Response.json({ error: "Invalid or expired code." }, { status: 404 });
    }
    if (data.used_at) {
      return Response.json({ error: "Code already used." }, { status: 410 });
    }
    if (new Date(data.expires_at).getTime() <= Date.now()) {
      return Response.json({ error: "Invalid or expired code." }, { status: 410 });
    }

    const { error: updateError } = await supabase
      .from("pairing_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("code", code)
      .is("used_at", null);

    if (updateError) {
      return Response.json(
        { error: "Failed to redeem code.", detail: updateError.message },
        { status: 500 },
      );
    }

    return Response.json({ accountId: data.account_id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
