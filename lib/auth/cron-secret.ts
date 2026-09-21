import { timingSafeEqual } from "node:crypto";

/**
 * Vérifie `Authorization: Bearer <CRON_SECRET>` en temps constant.
 * Retourne false si le secret est absent ou si les longueurs diffèrent.
 */
export function verifyBearerCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;

  const token = header.slice("Bearer ".length);
  const tokenBuf = Buffer.from(token);
  const secretBuf = Buffer.from(secret);
  if (tokenBuf.length !== secretBuf.length) return false;

  try {
    return timingSafeEqual(tokenBuf, secretBuf);
  } catch {
    return false;
  }
}
