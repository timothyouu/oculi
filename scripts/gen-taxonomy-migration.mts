// Emits a migration that upserts every place's full payload (now carrying sceneTypes /
// easeOfVisit / bestLight) into oculi_demo_catalog_items. Run: npx tsx scripts/gen-taxonomy-migration.mts
import { writeFileSync } from "node:fs";
import { places } from "../lib/data";

const rows = places
  .map((place) => `  ${JSON.stringify(place)}`)
  .join(",\n");

const sql = `-- Refresh place catalog payloads with curated scene/ease/best-light taxonomy fields.
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

const out = new URL("../supabase/migrations/20260709000100_place_taxonomy_fields.sql", import.meta.url);
writeFileSync(out, sql);
console.log(`Wrote migration with ${places.length} place rows.`);
