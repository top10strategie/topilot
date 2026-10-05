import { createHmac, timingSafeEqual } from "node:crypto";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";

export const PURGE_REAUTH_TTL_SECONDS = 15 * 60;

function signPayload(payload: string): string {
  return createHmac("sha256", getSupabaseServiceRoleKey())
    .update(payload)
    .digest("base64url");
}

export function createPurgeReauthCookieValue(
  collaboratorId: string,
  nowMs = Date.now(),
): string {
  const exp = Math.floor(nowMs / 1000) + PURGE_REAUTH_TTL_SECONDS;
  const payload = `${collaboratorId}|${exp}`;
  return `${payload}|${signPayload(payload)}`;
}

export function verifyPurgeReauthCookieValue(
  raw: string | undefined,
  collaboratorId: string,
  nowMs = Date.now(),
): boolean {
  if (!raw) return false;
  const parts = raw.split("|");
  if (parts.length !== 3) return false;
  const [id, expRaw, sig] = parts;
  if (!id || !expRaw || !sig) return false;
  if (id !== collaboratorId) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp * 1000 < nowMs) return false;

  const payload = `${id}|${expRaw}`;
  const expected = signPayload(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
