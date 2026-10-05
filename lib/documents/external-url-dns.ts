import { lookup } from "node:dns/promises";
import {
  isPrivateOrLocalIpv4,
  isPrivateOrLocalIpv6,
  type SafeExternalUrlResult,
} from "@/lib/documents/external-url";

/**
 * Résout l'hôte et refuse toute adresse privée (anti-SSRF DNS / IPv6).
 * Usage serveur uniquement (proxy téléchargement).
 */
export async function assertResolvedPublicHostname(
  hostname: string,
): Promise<SafeExternalUrlResult> {
  try {
    const records = await lookup(hostname, { all: true });
    if (records.length === 0) {
      return { ok: false, error: "Hôte introuvable." };
    }
    for (const record of records) {
      const address = record.address.toLowerCase();
      if (record.family === 4 && isPrivateOrLocalIpv4(address)) {
        return { ok: false, error: "Adresse réseau privée non autorisée." };
      }
      if (record.family === 6 && isPrivateOrLocalIpv6(address)) {
        return { ok: false, error: "Adresse réseau privée non autorisée." };
      }
    }
    return { ok: true, href: hostname, hostname };
  } catch {
    return { ok: false, error: "Hôte introuvable." };
  }
}
