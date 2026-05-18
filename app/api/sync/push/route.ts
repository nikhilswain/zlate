import { getSupabaseAdmin } from "@/lib/supabase";
import { checkRateLimit, getCloudflareEnv } from "@/lib/cloudflareEnv";
import { serverError } from "@/lib/apiError";
import type {
  DayNoteWire,
  ProjectWire,
  SettingsWire,
} from "@/lib/wireFormat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidIsoDate(s: unknown): s is string {
  return typeof s === "string" && !isNaN(new Date(s).getTime());
}

function getBearerAccountId(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  return token;
}

type PushBody = {
  projects?: ProjectWire[];
  dayNotes?: DayNoteWire[];
  settings?: SettingsWire | null;
};

type ApplyCounters = {
  projects: number;
  dayNotes: number;
  settingsUpdated: boolean;
};

export async function POST(request: Request) {
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

    let body: PushBody;
    try {
      body = (await request.json()) as PushBody;
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (Array.isArray(body.projects)) {
      for (const p of body.projects) {
        if (!isValidIsoDate(p?.updated_at)) {
          return Response.json(
            { error: "Invalid project updated_at." },
            { status: 400 },
          );
        }
      }
    }
    if (Array.isArray(body.dayNotes)) {
      for (const n of body.dayNotes) {
        if (!isValidIsoDate(n?.updated_at)) {
          return Response.json(
            { error: "Invalid day note updated_at." },
            { status: 400 },
          );
        }
      }
    }
    if (body.settings && !isValidIsoDate(body.settings.updated_at)) {
      return Response.json(
        { error: "Invalid settings updated_at." },
        { status: 400 },
      );
    }

    const counters: ApplyCounters = {
      projects: 0,
      dayNotes: 0,
      settingsUpdated: false,
    };

    // Projects — LWW by updated_at
    if (Array.isArray(body.projects) && body.projects.length > 0) {
      for (const incoming of body.projects) {
        const { data: existing } = await supabase
          .from("projects")
          .select("updated_at")
          .eq("account_id", accountId)
          .eq("id", incoming.id)
          .maybeSingle();

        if (
          existing &&
          new Date(incoming.updated_at).getTime() <=
            new Date(existing.updated_at).getTime()
        ) {
          continue;
        }

        const row = { ...incoming, account_id: accountId };
        const { error: upsertError } = await supabase
          .from("projects")
          .upsert(row, { onConflict: "account_id,id" });
        if (upsertError) {
          return serverError(upsertError, "Failed to upsert project.");
        }
        counters.projects += 1;
      }
    }

    // Day notes — same LWW logic
    if (Array.isArray(body.dayNotes) && body.dayNotes.length > 0) {
      for (const incoming of body.dayNotes) {
        const { data: existing } = await supabase
          .from("day_notes")
          .select("updated_at")
          .eq("account_id", accountId)
          .eq("id", incoming.id)
          .maybeSingle();

        if (
          existing &&
          new Date(incoming.updated_at).getTime() <=
            new Date(existing.updated_at).getTime()
        ) {
          continue;
        }

        const row = { ...incoming, account_id: accountId };
        const { error: upsertError } = await supabase
          .from("day_notes")
          .upsert(row, { onConflict: "account_id,id" });
        if (upsertError) {
          return serverError(upsertError, "Failed to upsert day note.");
        }
        counters.dayNotes += 1;
      }
    }

    // Settings — singleton per account, whole-row LWW
    if (body.settings) {
      const incoming = body.settings;
      const { data: existing } = await supabase
        .from("settings")
        .select("updated_at")
        .eq("account_id", accountId)
        .maybeSingle();

      const shouldUpdate =
        !existing ||
        new Date(incoming.updated_at).getTime() >
          new Date(existing.updated_at).getTime();

      if (shouldUpdate) {
        const row = { ...incoming, account_id: accountId };
        const { error: upsertError } = await supabase
          .from("settings")
          .upsert(row, { onConflict: "account_id" });
        if (upsertError) {
          return serverError(upsertError, "Failed to upsert settings.");
        }
        counters.settingsUpdated = true;
      }
    }

    return Response.json({ applied: counters });
  } catch (err) {
    return serverError(err);
  }
}
