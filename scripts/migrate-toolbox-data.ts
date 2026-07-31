/**
 * Migration one-shot Top10CRM → TOPilot (tables toolbox).
 * Usage:
 *   V2_SUPABASE_URL + V2_SUPABASE_SERVICE_ROLE_KEY
 *   (ou NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY depuis .env.local)
 *   V1_* pour lire la source, OU --from-dump scripts/.toolbox-dump.json
 *
 *   npx tsx scripts/migrate-toolbox-data.ts
 *   npx tsx scripts/migrate-toolbox-data.ts --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

const dryRun = process.argv.includes("--dry-run");

function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Variable manquante : ${name}`);
  return v;
}

async function main() {
  const v2Url = env(
    "V2_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const v2Key = env(
    "V2_SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const target = createClient(v2Url, v2Key, {
    auth: { persistSession: false },
  });

  const dumpPath = resolve(process.cwd(), "scripts/.toolbox-dump.json");
  if (!existsSync(dumpPath)) {
    throw new Error(
      `Dump manquant : ${dumpPath}. Générez-le via MCP ou fournissez V1_* + lecture live (non implémentée ici — utilisez le dump).`,
    );
  }

  const dump = JSON.parse(readFileSync(dumpPath, "utf8")) as {
    categories: Array<{ id: string; label: string; created_at: string }>;
    tools: Array<{
      id: string;
      tool_name: string;
      url: string;
      description: string | null;
      created_at: string;
      updated_at: string | null;
    }>;
    tool_category_links: Array<{
      tool_id: string;
      tool_category_id: string;
    }>;
    accesses: Array<{
      id: string;
      tool_id: string;
      label: string;
      identifier: string;
      vault_secret_id: string;
      is_private: boolean;
      created_at: string;
      updated_at: string | null;
    }>;
    subscriptions: Array<{
      id: string;
      tool_id: string;
      title: string;
      subscription_plan: string;
      created_at: string;
      updated_at: string | null;
    }>;
    prices: Array<{
      id: string;
      subscription_id: string;
      currency: string;
      amount: number;
      valid_from: string;
      valid_to: string | null;
      created_at: string;
    }>;
    rates: Array<{
      id: string;
      currency: string;
      rate: number;
      date: string;
    }>;
  };

  console.log(
    dryRun
      ? "Mode --dry-run (aucune écriture)\n"
      : "Migration réelle vers TOPilot\n",
  );

  // 1. Categories — upsert by label, keep map oldId → finalId
  const { data: existingCats } = await target
    .from("category")
    .select("id, label");
  const labelToId = new Map(
    (existingCats ?? []).map((c) => [c.label as string, c.id as string]),
  );
  const oldCatToNew = new Map<string, string>();

  for (const cat of dump.categories) {
    const existing = labelToId.get(cat.label);
    if (existing) {
      oldCatToNew.set(cat.id, existing);
      continue;
    }
    if (dryRun) {
      oldCatToNew.set(cat.id, cat.id);
      labelToId.set(cat.label, cat.id);
      continue;
    }
    const { data, error } = await target
      .from("category")
      .insert({ id: cat.id, label: cat.label, created_at: cat.created_at })
      .select("id")
      .single();
    if (error) {
      // label race or id conflict — fetch by label
      const { data: again } = await target
        .from("category")
        .select("id")
        .eq("label", cat.label)
        .maybeSingle();
      if (!again) throw new Error(`category ${cat.label}: ${error.message}`);
      oldCatToNew.set(cat.id, again.id);
      labelToId.set(cat.label, again.id);
    } else {
      oldCatToNew.set(cat.id, data.id);
      labelToId.set(cat.label, data.id);
    }
  }
  console.log(`Categories mappées : ${oldCatToNew.size}`);

  // 2. Tools
  if (!dryRun) {
    const { error } = await target.from("tool").upsert(
      dump.tools.map((t) => ({
        id: t.id,
        tool_name: t.tool_name,
        url: t.url,
        description: t.description,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
      { onConflict: "id" },
    );
    if (error) throw new Error(`tool: ${error.message}`);
  }
  console.log(`Tools : ${dump.tools.length}`);

  // 3. tool_category junctions
  const junctions = dump.tool_category_links
    .map((l) => {
      const category_id = oldCatToNew.get(l.tool_category_id);
      if (!category_id) return null;
      return { tool_id: l.tool_id, category_id };
    })
    .filter(Boolean);
  if (!dryRun && junctions.length) {
    const { error } = await target
      .from("tool_category")
      .upsert(junctions, { onConflict: "tool_id,category_id" });
    if (error) throw new Error(`tool_category: ${error.message}`);
  }
  console.log(`tool_category : ${junctions.length}`);

  // 4. tool_access
  if (!dryRun) {
    const { error } = await target.from("tool_access").upsert(
      dump.accesses.map((a) => ({
        id: a.id,
        tool_id: a.tool_id,
        client_id: null,
        label: a.label,
        identifier: a.identifier,
        vault_secret_id: a.vault_secret_id,
        is_private: a.is_private,
        created_at: a.created_at,
        updated_at: a.updated_at,
      })),
      { onConflict: "id" },
    );
    if (error) throw new Error(`tool_access: ${error.message}`);
  }
  console.log(`tool_access : ${dump.accesses.length}`);

  // 5. subscriptions
  if (!dryRun) {
    const { error } = await target.from("tool_subscription").upsert(
      dump.subscriptions.map((s) => ({
        id: s.id,
        tool_id: s.tool_id,
        title: s.title,
        subscription_plan: s.subscription_plan,
        created_at: s.created_at,
        updated_at: s.updated_at,
      })),
      { onConflict: "id" },
    );
    if (error) throw new Error(`tool_subscription: ${error.message}`);
  }
  console.log(`tool_subscription : ${dump.subscriptions.length}`);

  // 6. prices
  if (!dryRun) {
    const { error } = await target.from("tool_subscription_price").upsert(
      dump.prices.map((p) => ({
        id: p.id,
        tool_subscription_id: p.subscription_id,
        currency: p.currency,
        amount: p.amount,
        valid_from: p.valid_from,
        valid_to: p.valid_to,
        created_at: p.created_at,
      })),
      { onConflict: "id" },
    );
    if (error) throw new Error(`tool_subscription_price: ${error.message}`);
  }
  console.log(`tool_subscription_price : ${dump.prices.length}`);

  // 7. exchange_rate
  if (!dryRun) {
    const { error } = await target.from("exchange_rate").upsert(
      dump.rates.map((r) => ({
        id: r.id,
        currency: r.currency,
        rate: r.rate,
        date: r.date,
      })),
      { onConflict: "id" },
    );
    if (error) throw new Error(`exchange_rate: ${error.message}`);
  }
  console.log(`exchange_rate : ${dump.rates.length}`);

  const counts = await Promise.all([
    target.from("tool").select("id", { count: "exact", head: true }),
    target.from("tool_access").select("id", { count: "exact", head: true }),
    target.from("tool_subscription").select("id", { count: "exact", head: true }),
    target.from("exchange_rate").select("id", { count: "exact", head: true }),
  ]);
  console.log("\n--- Comptes TOPilot ---");
  console.log(`tool: ${counts[0].count}`);
  console.log(`tool_access: ${counts[1].count}`);
  console.log(`tool_subscription: ${counts[2].count}`);
  console.log(`exchange_rate: ${counts[3].count}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
