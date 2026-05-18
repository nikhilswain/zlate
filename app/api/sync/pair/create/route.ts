import { getSupabaseAdmin } from "@/lib/supabase";
import { checkRateLimit, getCloudflareEnv } from "@/lib/cloudflareEnv";
import { serverError } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_TTL_MS = 5 * 60 * 1000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (I/O/0/1)
const CODE_LENGTH = 6;
const MAX_INSERT_ATTEMPTS = 3;

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function getBearerAccountId(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  // Crude UUID shape check; full validation happens via DB lookup
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  return token;
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

    const accountId = getBearerAccountId(request);
    if (!accountId) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: account, error: lookupError } = await supabase
      .from("accounts")
      .select("account_id")
      .eq("account_id", accountId)
      .maybeSingle();

    if (lookupError || !account) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

    for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt++) {
      const code = generateCode();
      const { error } = await supabase
        .from("pairing_codes")
        .insert({ code, account_id: accountId, expires_at: expiresAt });

      if (!error) {
        return Response.json({ code, expiresAt });
      }
      // Postgres unique-violation error code; retry on collision
      if (error.code !== "23505") {
        return serverError(error, "Failed to create pairing code.");
      }
    }

    return serverError(
      new Error("Pairing code collision after max attempts"),
      "Failed to generate a unique code. Try again.",
    );
  } catch (err) {
    return serverError(err);
  }
}
