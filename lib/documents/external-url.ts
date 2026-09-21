/**
 * Validation des URL documents externes (anti open-redirect / SSRF).
 * Autorise uniquement http(s) vers des hôtes publics.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
]);

function isPrivateOrLocalIpv4(hostname: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!m) return false;
  const parts = m.slice(1).map((p) => Number(p));
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts as [number, number, number, number];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateOrLocalIpv6(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "::1") return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // ULA
  if (h.startsWith("fe80")) return true; // link-local
  return false;
}

export type SafeExternalUrlResult =
  | { ok: true; href: string }
  | { ok: false; error: string };

/**
 * Parse et valide une URL externe pour stockage / redirect / fetch proxy.
 */
export function assertSafeExternalUrl(raw: string): SafeExternalUrlResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "URL manquante." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "URL invalide." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      error: "Seuls les liens http(s) sont autorisés.",
    };
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname) {
    return { ok: false, error: "Hôte manquant dans l'URL." };
  }

  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost")) {
    return { ok: false, error: "Hôte non autorisé." };
  }

  if (isPrivateOrLocalIpv4(hostname) || isPrivateOrLocalIpv6(hostname)) {
    return { ok: false, error: "Adresse réseau privée non autorisée." };
  }

  return { ok: true, href: parsed.href };
}
