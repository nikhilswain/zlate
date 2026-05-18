import { getSupabaseAdmin } from "@/lib/supabase";
import { checkRateLimit, getCloudflareEnv } from "@/lib/cloudflareEnv";
import { serverError } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBearerAccountId(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  return token;
}

export async function GET(request: Request) {
  try {
    const env = await getCloudflareEnv();
    const accountId = getBearerAccountId(request);
    if (!accountId) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (!(await checkRateLimit(env.SYNC_LIMIT, accountId))) {
      return Response.json(
        { error: "Sync rate limit. Wait a minute and try again." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
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

    const url = new URL(request.url);
    const since = url.searchParams.get("since");

    const serverTime = new Date().toISOString();

    let projectsQuery = supabase
      .from("projects")
      .select(
        "id, name, icon, base_color, description, start_date, end_date, created_at, updated_at, deleted_at",
      )
      .eq("account_id", accountId);
    if (since) projectsQuery = projectsQuery.gt("updated_at", since);

    let notesQuery = supabase
      .from("day_notes")
      .select(
        "id, project_id, date_key, text, created_at, updated_at, deleted_at",
      )
      .eq("account_id", accountId);
    if (since) notesQuery = notesQuery.gt("updated_at", since);

    let settingsQuery = supabase
      .from("settings")
      .select(
        "theme, render_mode, view, week_starts_on, sidebar_collapsed, updated_at",
      )
      .eq("account_id", accountId);
    if (since) settingsQuery = settingsQuery.gt("updated_at", since);

    const [projectsRes, notesRes, settingsRes] = await Promise.all([
      projectsQuery,
      notesQuery,
      settingsQuery.maybeSingle(),
    ]);

    if (projectsRes.error || notesRes.error || settingsRes.error) {
      return serverError(
        projectsRes.error ?? notesRes.error ?? settingsRes.error,
        "Pull query failed.",
      );
    }

    return Response.json({
      projects: projectsRes.data ?? [],
      dayNotes: notesRes.data ?? [],
      settings: settingsRes.data ?? null,
      serverTime,
    });
  } catch (err) {
    return serverError(err);
  }
}
