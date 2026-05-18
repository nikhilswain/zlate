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

export async function GET(request: Request) {
  try {
    const env = await getCloudflareEnv();
    const ip = getClientIp(request);
    // Shares the PAIRING_LIMIT bucket — knowing a code's status is just as
    // sensitive as trying to redeem it, so the same rate limit applies.
    if (!(await checkRateLimit(env.PAIRING_LIMIT, ip))) {
      return Response.json(
        { error: "Too many attempts. Wait a minute and try again." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    const url = new URL(request.url);
    const rawCode = url.searchParams.get("code");
    if (!rawCode) {
      return Response.json({ error: "Missing code." }, { status: 400 });
    }
    const code = rawCode.trim().toUpperCase().replace(/[\s-]/g, "");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("pairing_codes")
      .select("used_at, expires_at")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      return serverError(error, "Failed to check pairing status.");
    }
    if (!data) {
      return Response.json({ exists: false, used: false, expired: false });
    }

    const expired = new Date(data.expires_at).getTime() <= Date.now();
    const used = data.used_at !== null;
    return Response.json({ exists: true, used, expired });
  } catch (err) {
    return serverError(err);
  }
}
