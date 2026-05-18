import { getSupabaseAdmin } from "@/lib/supabase";
import { checkRateLimit, getCloudflareEnv } from "@/lib/cloudflareEnv";
import { serverError } from "@/lib/apiError";

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
    const { data: redeemed, error: updateError } = await supabase
      .from("pairing_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("code", code)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("account_id")
      .maybeSingle();

    if (updateError) {
      return serverError(updateError, "Failed to redeem code.");
    }
    if (!redeemed) {
      return Response.json({ error: "Invalid or expired code." }, { status: 410 });
    }

    return Response.json({ accountId: redeemed.account_id });
  } catch (err) {
    return serverError(err);
  }
}
