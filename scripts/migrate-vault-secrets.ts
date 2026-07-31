/**
 * Migration des secrets Supabase Vault : projet V1 -> projet V2.
 *
 * Contexte : la table `tool_access` a déjà été migrée par le script SQL (staging -> public)
 * décrit dans le document de schéma (§20). Les lignes `tool_access` de la V2 portent donc déjà
 * les mêmes `id` et le même `vault_secret_id` (texte) que la V1 — mais le secret associé
 * n'existe, lui, que dans le Vault du projet V1. Ce script :
 *
 *   1. Lit chaque `tool_access` de la V1 (source de vérité pour la liste des secrets à migrer).
 *   2. Déchiffre le mot de passe correspondant dans le Vault V1
 *      (référence nommée via RPC `read_secret`, ou référence UUID héritée via
 *      `vault.decrypted_secrets`).
 *   3. Recrée un secret dans le Vault V2 sous EXACTEMENT le même nom
 *      (`vault_secret_id`), pour que la ligne `tool_access` déjà migrée en V2
 *      pointe correctement sans aucune mise à jour supplémentaire.
 *   4. Est idempotent : si le secret existe déjà côté V2 (relecture réussie),
 *      la ligne est ignorée — le script peut être relancé sans risque après une
 *      interruption partielle.
 *
 * Ce script NE modifie jamais la V1 (lecture seule) et n'écrit dans la V2 que
 * via les RPC Vault dédiées (jamais de manipulation directe de `vault.secrets`).
 *
 * Prérequis (variables d'environnement, `.env.local` chargé automatiquement) :
 *   V1_SUPABASE_URL, V1_SUPABASE_SERVICE_ROLE_KEY   -> projet source Top10CRM (obligatoire)
 *   V2_SUPABASE_URL, V2_SUPABASE_SERVICE_ROLE_KEY   -> TOPilot
 *     (fallback : NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 *
 * Exécution :
 *   npx tsx scripts/migrate-vault-secrets.ts            # migration réelle
 *   npx tsx scripts/migrate-vault-secrets.ts --dry-run  # simulation, aucune écriture côté V2
 *
 * Dépendance : @supabase/supabase-js (déjà utilisée par le projet).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));

/** Charge le .env Top10CRM et mappe vers V1_* s'ils manquent. */
function loadV1FromSiblingEnv() {
  const candidates = [
    resolve(process.cwd(), "../top10crm/.env"),
    resolve(process.cwd(), "../top10crm/.env.local"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const bag: Record<string, string> = {};
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      bag[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    if (!process.env.V1_SUPABASE_URL && bag.NEXT_PUBLIC_SUPABASE_URL) {
      process.env.V1_SUPABASE_URL = bag.NEXT_PUBLIC_SUPABASE_URL;
    }
    if (
      !process.env.V1_SUPABASE_SERVICE_ROLE_KEY &&
      bag.SUPABASE_SERVICE_ROLE_KEY
    ) {
      process.env.V1_SUPABASE_SERVICE_ROLE_KEY = bag.SUPABASE_SERVICE_ROLE_KEY;
    }
    break;
  }
}

loadV1FromSiblingEnv();

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function requiredEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v || v.trim() === "") {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return v.trim();
}

type ToolAccessRow = {
  id: string;
  tool_id: string;
  label: string;
  vault_secret_id: string;
};

type MigrationOutcome =
  | { status: "migrated"; id: string; vaultSecretId: string }
  | { status: "skipped_already_present"; id: string; vaultSecretId: string }
  | { status: "failed"; id: string; vaultSecretId: string; reason: string };

/** Lit le mot de passe en clair depuis le Vault source (nom ou UUID hérité). */
async function readSourceSecret(
  sourceAdmin: SupabaseClient,
  vaultSecretId: string,
): Promise<{ ok: true; value: string } | { ok: false; reason: string }> {
  if (isUuid(vaultSecretId)) {
    const { data, error } = await sourceAdmin
      .schema("vault")
      .from("decrypted_secrets")
      .select("decrypted_secret")
      .eq("id", vaultSecretId)
      .maybeSingle();

    if (error || !data || data.decrypted_secret == null) {
      return {
        ok: false,
        reason: error?.message ?? "Secret UUID introuvable côté V1.",
      };
    }
    return { ok: true, value: String(data.decrypted_secret) };
  }

  const { data, error } = await sourceAdmin.rpc("read_secret", {
    secret_name: vaultSecretId,
  });

  if (error) {
    return { ok: false, reason: error.message };
  }

  const value =
    typeof data === "string"
      ? data
      : typeof data === "object" && data !== null && "read_secret" in data
        ? String((data as { read_secret?: unknown }).read_secret ?? "")
        : null;

  if (!value) {
    return { ok: false, reason: "Réponse read_secret vide ou inattendue." };
  }
  return { ok: true, value };
}

/** true si un secret de ce nom existe déjà côté cible (permet l'idempotence). */
async function targetSecretAlreadyExists(
  targetAdmin: SupabaseClient,
  vaultSecretId: string,
): Promise<boolean> {
  const { data, error } = await targetAdmin.rpc("read_secret", {
    secret_name: vaultSecretId,
  });
  return !error && data != null;
}

/** Crée le secret côté cible sous le même nom que la source. */
async function writeTargetSecret(
  targetAdmin: SupabaseClient,
  vaultSecretId: string,
  value: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { error } = await targetAdmin.rpc("insert_secret", {
    secret_name: vaultSecretId,
    secret_value: value,
  });
  if (error) {
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

async function fetchAllToolAccess(
  sourceAdmin: SupabaseClient,
): Promise<ToolAccessRow[]> {
  const rows: ToolAccessRow[] = [];
  const pageSize = 500;
  let from = 0;

  for (;;) {
    const { data, error } = await sourceAdmin
      .from("tool_access")
      .select("id, tool_id, label, vault_secret_id")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(
        `Impossible de lister tool_access côté V1 : ${error.message}`,
      );
    }
    if (!data || data.length === 0) {
      break;
    }
    rows.push(...(data as ToolAccessRow[]));
    if (data.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return rows;
}

async function migrateOneSecret(
  sourceAdmin: SupabaseClient,
  targetAdmin: SupabaseClient,
  row: ToolAccessRow,
  dryRun: boolean,
): Promise<MigrationOutcome> {
  const alreadyThere = await targetSecretAlreadyExists(
    targetAdmin,
    row.vault_secret_id,
  );
  if (alreadyThere) {
    return {
      status: "skipped_already_present",
      id: row.id,
      vaultSecretId: row.vault_secret_id,
    };
  }

  const read = await readSourceSecret(sourceAdmin, row.vault_secret_id);
  if (!read.ok) {
    return {
      status: "failed",
      id: row.id,
      vaultSecretId: row.vault_secret_id,
      reason: `Lecture V1 échouée : ${read.reason}`,
    };
  }

  if (dryRun) {
    return {
      status: "migrated",
      id: row.id,
      vaultSecretId: row.vault_secret_id,
    };
  }

  const write = await writeTargetSecret(
    targetAdmin,
    row.vault_secret_id,
    read.value,
  );
  if (!write.ok) {
    return {
      status: "failed",
      id: row.id,
      vaultSecretId: row.vault_secret_id,
      reason: `Écriture V2 échouée : ${write.reason}`,
    };
  }

  return {
    status: "migrated",
    id: row.id,
    vaultSecretId: row.vault_secret_id,
  };
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  const sourceAdmin = createClient(
    requiredEnv("V1_SUPABASE_URL"),
    requiredEnv("V1_SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
  const targetAdmin = createClient(
    requiredEnv("V2_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    requiredEnv(
      "V2_SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    { auth: { persistSession: false } },
  );

  console.log(
    dryRun
      ? "Mode simulation (--dry-run) : aucune écriture ne sera faite côté V2.\n"
      : "Mode réel : les secrets seront écrits dans le Vault V2.\n",
  );

  const rows = await fetchAllToolAccess(sourceAdmin);
  console.log(`${rows.length} ligne(s) tool_access trouvée(s) côté V1.\n`);

  const outcomes: MigrationOutcome[] = [];

  for (const row of rows) {
    const outcome = await migrateOneSecret(
      sourceAdmin,
      targetAdmin,
      row,
      dryRun,
    );
    outcomes.push(outcome);

    const prefix = `[${row.label}] (${row.vault_secret_id})`;
    if (outcome.status === "migrated") {
      console.log(`  OK       ${prefix}`);
    } else if (outcome.status === "skipped_already_present") {
      console.log(`  IGNORÉ   ${prefix} — déjà présent côté V2.`);
    } else {
      console.error(`  ÉCHEC    ${prefix} — ${outcome.reason}`);
    }
  }

  const migrated = outcomes.filter((o) => o.status === "migrated").length;
  const skipped = outcomes.filter(
    (o) => o.status === "skipped_already_present",
  ).length;
  const failed = outcomes.filter((o) => o.status === "failed");

  console.log("\n--- Résumé ---");
  console.log(`Total       : ${outcomes.length}`);
  console.log(`Migrés      : ${migrated}`);
  console.log(`Déjà présents (ignorés) : ${skipped}`);
  console.log(`Échecs      : ${failed.length}`);

  if (failed.length > 0) {
    console.log("\nDétail des échecs (à rejouer après correction) :");
    for (const f of failed) {
      console.log(`  - id=${f.id} vault_secret_id=${f.vaultSecretId} : ${f.reason}`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Erreur fatale :", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
