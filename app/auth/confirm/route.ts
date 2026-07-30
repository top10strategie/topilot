import { FORCE_PASSWORD_CHANGE_PATH } from "@/lib/auth/constants";
import { resolveNextPath } from "@/lib/auth/resolve-next-path";
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = resolveNextPath(
    searchParams.get("next"),
    requestUrl,
    FORCE_PASSWORD_CHANGE_PATH,
  );

  const supabase = await createClient();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      redirect(next);
    }
    redirect(
      `/auth/error?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`,
    );
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(next);
    }
    redirect(
      `/auth/error?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`,
    );
  }

  // Pas de params serveur : possible flux implicite (#access_token) → page client.
  redirect(`/auth/callback?next=${encodeURIComponent(next)}`);
}
