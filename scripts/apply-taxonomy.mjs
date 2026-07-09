// One-shot: inject curated sceneTypes / easeOfVisit / bestLight into each place in lib/data.ts.
// Idempotent — skips a place that already has sceneTypes. Run: node scripts/apply-taxonomy.mjs
import { readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../lib/data.ts", import.meta.url);

// scene ⊆ {landscape,skyline,coast,architecture,portraits,street,bridge,color}
// light ⊆ {Golden hour,Sunrise,Sunset,Blue hour,Daylight,Night}
const curation = {
  "golden-gate-overlook": { scene: ["bridge", "landscape"], ease: "Easy", light: ["Sunrise", "Golden hour", "Blue hour"] },
  "baker-beach": { scene: ["coast", "bridge", "portraits"], ease: "Moderate", light: ["Sunset", "Golden hour"] },
  "palace-fine-arts": { scene: ["architecture", "portraits"], ease: "Easy", light: ["Daylight", "Golden hour"] },
  "twin-peaks": { scene: ["skyline", "landscape"], ease: "Moderate", light: ["Sunrise", "Golden hour", "Blue hour", "Night"] },
  "lands-end": { scene: ["coast", "landscape"], ease: "Moderate", light: ["Sunset", "Golden hour", "Daylight"] },
  "sutro-baths": { scene: ["coast", "landscape"], ease: "Moderate", light: ["Sunset", "Golden hour", "Daylight"] },
  "embarcadero": { scene: ["street", "skyline"], ease: "Easy", light: ["Blue hour", "Night"] },
  "dolores-park": { scene: ["portraits", "skyline"], ease: "Easy", light: ["Golden hour", "Daylight"] },
  "painted-ladies": { scene: ["architecture", "skyline", "color"], ease: "Easy", light: ["Daylight", "Golden hour"] },
  "battery-spencer": { scene: ["bridge", "landscape"], ease: "Moderate", light: ["Sunrise", "Golden hour"] },
  "marshall-beach": { scene: ["coast", "bridge", "landscape"], ease: "Difficult", light: ["Sunset", "Golden hour"] },
  "fort-point": { scene: ["architecture", "bridge"], ease: "Easy", light: ["Daylight", "Blue hour", "Golden hour"] },
  "chrissy-field": { scene: ["coast", "bridge", "portraits"], ease: "Easy", light: ["Sunrise", "Golden hour", "Daylight"] },
  "coit-tower": { scene: ["skyline", "architecture"], ease: "Easy", light: ["Daylight", "Golden hour", "Blue hour"] },
  "salesforce-park": { scene: ["architecture", "skyline", "portraits"], ease: "Easy", light: ["Daylight", "Golden hour", "Blue hour"] },
  "chinatown-grant": { scene: ["street", "color"], ease: "Easy", light: ["Daylight", "Blue hour", "Night"] },
  "ocean-beach": { scene: ["coast", "landscape"], ease: "Easy", light: ["Sunset", "Golden hour", "Daylight"] },
  "bernal-heights": { scene: ["skyline", "landscape", "portraits"], ease: "Moderate", light: ["Sunrise", "Sunset", "Golden hour"] },
  "grace-cathedral": { scene: ["architecture", "portraits"], ease: "Easy", light: ["Daylight", "Golden hour"] },
  "mission-murals": { scene: ["street", "color", "portraits"], ease: "Easy", light: ["Daylight", "Golden hour"] },
  "japanese-tea-garden": { scene: ["landscape", "architecture", "portraits"], ease: "Easy", light: ["Daylight", "Golden hour"] },
  "de-young-observation-deck": { scene: ["architecture", "skyline"], ease: "Easy", light: ["Daylight", "Golden hour"] },
  "muir-woods": { scene: ["landscape"], ease: "Moderate", light: ["Daylight"] },
  "mori-point": { scene: ["coast", "landscape"], ease: "Moderate", light: ["Sunset", "Golden hour"] },
  "ferry-plaza-market": { scene: ["street", "color"], ease: "Easy", light: ["Daylight", "Blue hour"] },
  "16th-avenue-tiles": { scene: ["architecture", "color", "portraits"], ease: "Moderate", light: ["Daylight", "Golden hour"] },
  "haight-ashbury": { scene: ["street", "color", "portraits"], ease: "Easy", light: ["Daylight", "Golden hour", "Night"] },
  "treasure-island": { scene: ["skyline"], ease: "Easy", light: ["Sunset", "Golden hour", "Blue hour", "Night"] },
  "brooklyn-bridge": { scene: ["bridge", "skyline", "street"], ease: "Moderate", light: ["Sunrise", "Golden hour", "Blue hour"] },
  "central-park-bethesda": { scene: ["architecture", "portraits"], ease: "Easy", light: ["Daylight", "Golden hour"] },
  "times-square": { scene: ["street", "color"], ease: "Easy", light: ["Night", "Blue hour"] },
  "washington-monument": { scene: ["architecture", "landscape"], ease: "Easy", light: ["Sunrise", "Golden hour", "Blue hour", "Daylight"] },
  "lincoln-memorial": { scene: ["architecture", "portraits"], ease: "Easy", light: ["Daylight", "Golden hour", "Night"] },
  "monument-valley": { scene: ["landscape"], ease: "Moderate", light: ["Sunrise", "Sunset", "Golden hour", "Night"] },
  "horseshoe-bend": { scene: ["landscape"], ease: "Moderate", light: ["Sunrise", "Golden hour", "Daylight"] },
  "grand-canyon-south-rim": { scene: ["landscape"], ease: "Easy", light: ["Sunrise", "Sunset", "Golden hour"] },
  "zion-canyon-overlook": { scene: ["landscape"], ease: "Moderate", light: ["Sunrise", "Golden hour", "Daylight"] },
  "bryce-canyon-amphitheater": { scene: ["landscape"], ease: "Easy", light: ["Sunrise", "Golden hour"] },
  "joshua-tree": { scene: ["landscape"], ease: "Moderate", light: ["Sunset", "Golden hour", "Blue hour", "Night"] },
  "santa-monica-pier": { scene: ["coast", "street"], ease: "Easy", light: ["Sunset", "Golden hour", "Blue hour", "Night"] },
  "griffith-observatory": { scene: ["skyline", "architecture"], ease: "Moderate", light: ["Golden hour", "Blue hour", "Night"] },
  "kerry-park": { scene: ["skyline"], ease: "Easy", light: ["Sunset", "Golden hour", "Blue hour", "Night"] },
  "pike-place-market": { scene: ["street", "color"], ease: "Easy", light: ["Daylight", "Blue hour"] },
  "chicago-riverwalk": { scene: ["architecture", "skyline"], ease: "Easy", light: ["Golden hour", "Blue hour", "Night"] },
  "millennium-park": { scene: ["architecture", "street"], ease: "Easy", light: ["Daylight", "Blue hour"] },
  "south-beach": { scene: ["coast", "architecture", "color"], ease: "Easy", light: ["Daylight", "Golden hour", "Night"] },
  "everglades-anjinga": { scene: ["landscape"], ease: "Moderate", light: ["Daylight"] },
  "french-quarter": { scene: ["street", "architecture", "color"], ease: "Easy", light: ["Daylight", "Blue hour", "Night"] },
  "acorn-street": { scene: ["street", "architecture", "portraits"], ease: "Easy", light: ["Daylight"] },
  "philadelphia-art-museum": { scene: ["architecture", "skyline"], ease: "Easy", light: ["Golden hour", "Daylight", "Blue hour"] },
  "dream-lake": { scene: ["landscape"], ease: "Difficult", light: ["Sunrise", "Golden hour", "Daylight"] },
  "grand-prismatic": { scene: ["landscape", "color"], ease: "Easy", light: ["Daylight"] },
  "schwabacher-landing": { scene: ["landscape"], ease: "Moderate", light: ["Sunrise", "Golden hour"] },
  "portland-japanese-garden": { scene: ["landscape", "portraits"], ease: "Easy", light: ["Daylight"] },
  "multnomah-falls": { scene: ["landscape"], ease: "Easy", light: ["Daylight"] },
  "nashville-broadway": { scene: ["street", "color"], ease: "Easy", light: ["Night", "Blue hour"] },
  "eiffel-tower-trocadero": { scene: ["architecture", "skyline"], ease: "Easy", light: ["Sunrise", "Golden hour", "Blue hour", "Night"] },
  "tower-bridge": { scene: ["bridge", "architecture"], ease: "Easy", light: ["Blue hour", "Night", "Daylight"] },
  "colosseum": { scene: ["architecture", "street"], ease: "Easy", light: ["Daylight", "Golden hour", "Blue hour"] },
  "shibuya-crossing": { scene: ["street", "color"], ease: "Easy", light: ["Night", "Blue hour"] },
  "pyramids-giza": { scene: ["landscape", "architecture"], ease: "Moderate", light: ["Sunrise", "Golden hour", "Daylight"] },
};

let text = readFileSync(FILE, "utf8");
const arr = (items) => "[" + items.map((v) => JSON.stringify(v)).join(", ") + "]";

let applied = 0;
const missing = [];
for (const [id, { scene, ease, light }] of Object.entries(curation)) {
  const idIdx = text.indexOf(`id: "${id}"`);
  if (idIdx === -1) {
    missing.push(id);
    continue;
  }
  // Guard against double-application.
  const objEnd = text.indexOf("\n  }", idIdx);
  if (text.slice(idIdx, objEnd).includes("sceneTypes:")) continue;

  const tagsIdx = text.indexOf("\n    tags: [", idIdx);
  if (tagsIdx === -1) {
    missing.push(id);
    continue;
  }
  const tagsLineEnd = text.indexOf("\n", tagsIdx + 1);
  const insertion =
    `\n    sceneTypes: ${arr(scene)},` +
    `\n    easeOfVisit: ${JSON.stringify(ease)},` +
    `\n    bestLight: ${arr(light)},`;
  text = text.slice(0, tagsLineEnd) + insertion + text.slice(tagsLineEnd);
  applied += 1;
}

writeFileSync(FILE, text);
console.log(`Applied taxonomy to ${applied} places. Missing: ${missing.length ? missing.join(", ") : "none"}.`);
