// Locked verifier for data.ts <-> Supabase sync (do NOT edit during a fix loop).
// Run: npx tsx scripts/verify-db-sync.mts [--sql-out <dir>]
//
// Checks, locally:
//   1. The committed place-taxonomy migration is byte-identical to what
//      gen-taxonomy-migration.mts would emit from lib/data.ts today (no drift).
//   2. lib/data.ts entity counts match the expected catalog shape.
// Emits, per kind, a SQL file that compares every local payload against
// public.oculi_demo_catalog_items by jsonb equality. Run those against the
// remote project; each must return zero rows. Runtime `upload-%` photo rows
// are expected remote extras (written by saveRemoteCatalogPhoto) and are
// excluded from the remote-extra check.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { places, photos, users, areas } from "../lib/data";

const MIGRATION_PATH = new URL(
  "../supabase/migrations/20260709000100_place_taxonomy_fields.sql",
  import.meta.url,
);

function regeneratedMigrationSql(): string {
  const rows = places.map((place) => `  ${JSON.stringify(place)}`).join(",\n");
  return `-- Refresh place catalog payloads with curated scene/ease/best-light taxonomy fields.
-- Generated from lib/data.ts (scripts/gen-taxonomy-migration.mts). Idempotent upsert.
insert into public.oculi_demo_catalog_items (kind, item_id, payload, updated_at)
select 'place', value->>'id', value, now()
from jsonb_array_elements($$[
${rows}
]$$::jsonb) as value
on conflict (kind, item_id) do update
set payload = excluded.payload,
    updated_at = excluded.updated_at;
`;
}

function comparisonSql(kind: string, items: unknown[], allowExtraLike?: string): string {
  const rows = items.map((item) => `  ${JSON.stringify(item)}`).join(",\n");
  const extraFilter = allowExtraLike
    ? ` and t.item_id not like '${allowExtraLike}'`
    : "";
  return `-- Verifier: every local ${kind} payload must exist remotely with jsonb-equal payload,
-- and no unexpected remote ${kind} rows may exist. Expected result: zero rows.
with expected as (
  select value->>'id' as item_id, value as payload
  from jsonb_array_elements($$[
${rows}
]$$::jsonb) as value
)
select 'missing_or_diff' as problem, e.item_id
from expected e
left join public.oculi_demo_catalog_items t
  on t.kind = '${kind}' and t.item_id = e.item_id
where t.item_id is null or t.payload is distinct from e.payload
union all
select 'remote_extra' as problem, t.item_id
from public.oculi_demo_catalog_items t
where t.kind = '${kind}'${extraFilter}
  and not exists (select 1 from expected e where e.item_id = t.item_id)
order by 1, 2;
`;
}

const sqlOutFlag = process.argv.indexOf("--sql-out");
const sqlOutDir = sqlOutFlag !== -1 ? process.argv[sqlOutFlag + 1] : null;

let failed = false;

const committed = readFileSync(MIGRATION_PATH, "utf8");
if (committed !== regeneratedMigrationSql()) {
  failed = true;
  console.error(
    "FAIL: supabase/migrations/20260709000100_place_taxonomy_fields.sql is out of " +
      "sync with lib/data.ts. Regenerate it with: npx tsx scripts/gen-taxonomy-migration.mts",
  );
} else {
  console.log("OK: taxonomy migration matches lib/data.ts");
}

const counts = {
  place: places.length,
  photo: photos.length,
  user: users.length,
  area: areas.length,
};
console.log(`OK: local counts ${JSON.stringify(counts)}`);

if (sqlOutDir) {
  mkdirSync(sqlOutDir, { recursive: true });
  const kinds: Array<[string, unknown[], string | undefined]> = [
    ["place", places, undefined],
    ["photo", photos, "upload-%"],
    ["user", users, undefined],
    ["area", areas, undefined],
  ];
  for (const [kind, items, allowExtra] of kinds) {
    const path = join(sqlOutDir, `verify-${kind}.sql`);
    writeFileSync(path, comparisonSql(kind, items, allowExtra));
    console.log(`Wrote ${path} (${items.length} ${kind} payloads; expect zero rows)`);
  }
}

if (failed) process.exit(1);
console.log("Local verification passed. Run the emitted SQL against the remote project; every query must return zero rows.");
