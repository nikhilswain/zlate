import { getSupabaseAdmin } from "@/lib/supabase";
import { serverError } from "@/lib/apiError";

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
      return serverError(error, "Failed to create account.");
    }

    return Response.json({ accountId: data.account_id }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
