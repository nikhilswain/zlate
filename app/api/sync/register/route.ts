import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("accounts")
      .insert({})
      .select("account_id")
      .single();

    if (error) {
      return Response.json(
        { error: "Failed to create account.", detail: error.message },
        { status: 500 },
      );
    }

    return Response.json({ accountId: data.account_id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
