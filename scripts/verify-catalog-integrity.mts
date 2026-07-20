// DB-querying integrity check that replaces scripts/verify-db-sync.mts
// (docs/demo-to-product-implementation.md item 10, step 3 -- retiring
// verify-db-sync is a Tim-approved spec change recorded there: its
// data.ts-equality premise no longer holds now that the database is the
// source of truth for live catalog content, not lib/data.ts).
//
// Two modes:
//
//   npx tsx scripts/verify-catalog-integrity.mts
//     Remote mode (default). Fetches every `oculi_demo_catalog_items` row
//     from Supabase via the REST API using NEXT_PUBLIC_SUPABASE_URL and
//     NEXT_PUBLIC_SUPABASE_ANON_KEY from process.env (never read from a
//     file by this script -- pass them in the environment). Requires
//     network + credentials, so it is NOT run in CI.
//
//   npx tsx scripts/verify-catalog-integrity.mts --local
//     Local mode. Validates the bundled seed in lib/data.ts instead, so CI
//     (which has no DB credentials) still gets a real integrity check on
//     every push. This is what .github/workflows/ci.yml runs.
//
// Both modes assert the same two things over every place/photo/user/area
// payload:
//   1. Shape sanity: every payload parses through the matching validator in
//      lib/catalog-validation.ts (a null means a malformed row that would
//      previously have crashed the app downstream).
//   2. Taxonomy invariants (lib/place-taxonomy.ts) over every place: a
//      non-empty sceneTypes subset of SCENE_VALUES, a non-empty bestLight
//      subset of LIGHT_VALUES, and easeOfVisit in {Easy,Moderate,Difficult}.
// Remote mode additionally checks catalog shape: exactly 61 places / 110
// seed photos / 16 users / 21 areas (runtime `upload-%` photo rows are
// expected extras written by real uploads, excluded from the 110 count but
// still run through the photo validator).
//
// Exits non-zero with a clear message on any violation.

import {
  parseAreaPayload,
  parsePhotoPayload,
  parsePlacePayload,
  parseUserPayload,
} from "../lib/catalog-validation";
import { LIGHT_VALUES, SCENE_VALUES } from "../lib/place-taxonomy";
import type { Area, Photo, Place, User } from "../lib/types";

const EASE_VALUES = ["Easy", "Moderate", "Difficult"] as const;

const EXPECTED_COUNTS = { place: 61, photo: 110, user: 16, area: 21 } as const;

let failed = false;

function fail(message: string): void {
  failed = true;
  console.error(`FAIL: ${message}`);
}

function checkPlaceTaxonomy(place: Place): void {
  if (place.sceneTypes.length === 0) {
    fail(`${place.id}: sceneTypes is empty`);
  }
  for (const value of place.sceneTypes) {
    if (!SCENE_VALUES.includes(value)) {
      fail(`${place.id}: sceneTypes contains "${value}", not in SCENE_VALUES`);
    }
  }
  if (place.bestLight.length === 0) {
    fail(`${place.id}: bestLight is empty`);
  }
  for (const value of place.bestLight) {
    if (!LIGHT_VALUES.includes(value)) {
      fail(`${place.id}: bestLight contains "${value}", not in LIGHT_VALUES`);
    }
  }
  if (!EASE_VALUES.includes(place.easeOfVisit)) {
    fail(`${place.id}: easeOfVisit "${place.easeOfVisit}" is not one of ${EASE_VALUES.join("/")}`);
  }
}

function validateAll(
  kind: string,
  payloads: unknown[],
  parser: (payload: unknown) => unknown,
): void {
  payloads.forEach((payload) => {
    const parsed = parser(payload);
    if (parsed === null) {
      const id = (payload as { id?: unknown; item_id?: unknown })?.id ?? (payload as { item_id?: unknown })?.item_id ?? "<unknown id>";
      fail(`${kind} payload ${JSON.stringify(id)} failed catalog-validation parsing`);
    }
  });
}

async function runLocal(): Promise<void> {
  const { areas, photos, places, users } = await import("../lib/data");

  validateAll("place", places as unknown[], parsePlacePayload);
  validateAll("photo", photos as unknown[], parsePhotoPayload);
  validateAll("user", users as unknown[], parseUserPayload);
  validateAll("area", areas as unknown[], parseAreaPayload);

  for (const place of places as Place[]) {
    checkPlaceTaxonomy(place);
  }

  console.log(
    `Local seed: ${places.length} places, ${photos.length} photos, ${users.length} users, ${areas.length} areas.`,
  );
}

type CatalogRow = { kind: "user" | "area" | "place" | "photo"; item_id: string; payload: unknown };

async function fetchCatalogRows(url: string, anonKey: string): Promise<CatalogRow[]> {
  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/oculi_demo_catalog_items?select=kind,item_id,payload&order=item_id.asc`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase REST fetch failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as CatalogRow[];
}

async function runRemote(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error(
      "FAIL: remote mode requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "in the environment (never read from a file by this script). Use --local for a " +
        "credential-free check of the bundled seed instead.",
    );
    process.exit(1);
  }

  const rows = await fetchCatalogRows(url, anonKey);

  const byKind: Record<CatalogRow["kind"], CatalogRow[]> = { place: [], photo: [], user: [], area: [] };
  for (const row of rows) {
    byKind[row.kind].push(row);
  }

  const seedPhotoRows = byKind.photo.filter((row) => !row.item_id.startsWith("upload-"));
  const uploadExtraCount = byKind.photo.length - seedPhotoRows.length;

  const actualCounts = {
    place: byKind.place.length,
    photo: seedPhotoRows.length,
    user: byKind.user.length,
    area: byKind.area.length,
  };

  for (const kind of Object.keys(EXPECTED_COUNTS) as Array<keyof typeof EXPECTED_COUNTS>) {
    if (actualCounts[kind] !== EXPECTED_COUNTS[kind]) {
      fail(
        `catalog shape: expected ${EXPECTED_COUNTS[kind]} ${kind} rows, found ${actualCounts[kind]}`,
      );
    }
  }

  validateAll("place", byKind.place.map((row) => row.payload), parsePlacePayload);
  validateAll("photo", byKind.photo.map((row) => row.payload), parsePhotoPayload);
  validateAll("user", byKind.user.map((row) => row.payload), parseUserPayload);
  validateAll("area", byKind.area.map((row) => row.payload), parseAreaPayload);

  for (const row of byKind.place) {
    const place = parsePlacePayload(row.payload) as Place | null;
    if (place) checkPlaceTaxonomy(place);
  }

  console.log(
    `Remote: ${actualCounts.place} places, ${actualCounts.photo} seed photos ` +
      `(+${uploadExtraCount} upload extras), ${actualCounts.user} users, ${actualCounts.area} areas.`,
  );
}

const isLocal = process.argv.includes("--local");

(async () => {
  if (isLocal) {
    await runLocal();
  } else {
    await runRemote();
  }

  if (failed) {
    console.error("Catalog integrity check FAILED. See FAIL lines above.");
    process.exit(1);
  }
  console.log(`Catalog integrity check passed (${isLocal ? "local seed" : "remote DB"}).`);
})().catch((error) => {
  console.error("FAIL: verify-catalog-integrity threw:", error);
  process.exit(1);
});
