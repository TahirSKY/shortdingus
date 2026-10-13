#!/usr/bin/env node
/**
 * Static gate for a Playground clip composition. Run before you hand code to the user:
 *
 *   node tools/clipcheck/check.mjs clips/my-clip.tsx
 *
 * It compiles the file with the SAME Babel config the Playground uses
 * (src/lib/code-evaluator.ts: preset-react classic runtime + preset-typescript + commonjs),
 * then asserts the render rules from AGENT_ACCESS.md and the traps that have actually bitten us.
 * Needs @babel/standalone: (cd tools/clipcheck && npm i --no-save @babel/standalone)
 *
 * Exit code 1 = do not ship.
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const file = process.argv[2];
if (!file) {
  console.error("usage: node tools/clipcheck/check.mjs <clip.tsx>");
  process.exit(2);
}
const code = fs.readFileSync(file, "utf8");
const Babel = require("@babel/standalone");
const fails = [];
const warns = [];
const ok = (c, m) => { if (!c) fails.push(m); };

// 1. compiles under the Playground's exact transform
try {
  Babel.transform(code, {
    presets: [["react", { runtime: "classic" }], ["typescript", { isTSX: true, allExtensions: true }]],
    plugins: ["transform-modules-commonjs"],
    filename: path.basename(file),
  });
  console.log("babel            OK  (playground transform)");
} catch (e) {
  console.log("babel            FAIL\n" + e.message);
  process.exit(1);
}

// 2. REMOTION_CONFIG must be parseable by src/lib/detect-config.ts
const cfgM = /REMOTION_CONFIG\s*\{([\s\S]*?)\}/.exec(code);
let cfg = null;
if (!cfgM) fails.push("no /* REMOTION_CONFIG { ... } */ comment — the Playground cannot size the comp");
else {
  const loose = cfgM[1].trim().replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":').replace(/,(\s*[}\]])/g, "$1");
  try { cfg = JSON.parse("{" + loose + "}"); console.log("config           OK ", JSON.stringify(cfg)); }
  catch { fails.push("REMOTION_CONFIG is not parseable: " + cfgM[1].trim().slice(0, 80)); }
}

// 3. render rules (AGENT_ACCESS.md → Render rules)
ok(/^export default\s+/m.test(code), "no default export");
ok(!/\bMyVideo\b/.test(code), "component is named MyVideo (forbidden)");
ok(!/backdrop-filter|backdropFilter/.test(code), "backdrop-filter is used (Lambda renders it in software → timeouts)");
const imports = [...code.matchAll(/from\s+["']([^"']+)["']/g)].map((x) => x[1]);
const badImports = [...new Set(imports)].filter((i) => !["react", "remotion", "@remotion/lottie"].includes(i));
ok(badImports.length === 0, "imports outside the Playground allowlist: " + badImports.join(", "));
console.log("imports          OK ", [...new Set(imports)].join(", "));

// 4. ClipCamera markers: render-video swaps everything between them with the canonical helper.
const START = "// ---- ClipCamera";
const END = "// ---- end ClipCamera ----";
const si = code.indexOf(START), ei = code.indexOf(END);
ok(si >= 0 && ei > si, "ClipCamera markers missing (render-video needs them to inject the canonical helper)");
if (si >= 0 && ei > si) {
  const block = code.slice(si, ei + END.length);
  const CANON = "supabase/functions/_shared/clip-camera.ts";
  const squash = (s) => s.replace(/\s+/g, "");
  let canonical = null;
  try {
    const raw = fs.readFileSync(path.resolve(process.cwd(), CANON), "utf8");
    const a = raw.indexOf(START), b = raw.indexOf(END);
    // the canonical helper lives inside a template literal, so unescape it before comparing
    if (a >= 0 && b > a) canonical = raw.slice(a, b + END.length).replace(/\\(["`$\\])/g, "$1");
  } catch { /* not running from the repo root — fall back to the structural check */ }
  if (canonical) {
    const same = squash(block) === squash(canonical);
    ok(same, `the ClipCamera block differs from the canonical helper in ${CANON} — the Playground preview uses YOUR copy while Lambda swaps in the canonical one, so they must match. Install it with: python3 -c "..." or copy tools/clipkit/parts/camera.txt`);
    console.log("clipcamera       " + (same ? "OK  identical to the canonical helper (whitespace-normalised)" : "FAIL differs from canonical"));
  } else {
    ok(/const ClipCamera = /.test(block) && /const CropView = /.test(block) && /const camAt = /.test(block), "ClipCamera block is missing ClipCamera/CropView/camAt");
    warns.push(`${CANON} not found — structural marker check only, could not diff against the canonical helper`);
    console.log("clipcamera       OK  markers present (structural check only)");
  }
}

// 5. hub asset ids
const ids = [...new Set([...code.matchAll(/asset-url\?id=([0-9a-f-]{36})/g)].map((x) => x[1]))]
  .concat([...new Set([...code.matchAll(/assetUrl\("([0-9a-f-]{36})"\)/g)].map((x) => x[1]))]);
const uniq = [...new Set(ids)];
ok(uniq.every((i) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(i)), "malformed asset id");
console.log("asset ids        OK ", uniq.length + " unique");
const ext = [...new Set([...code.matchAll(/["'`](https?:\/\/[^"'`\s]+)["'`]/g)].map((x) => x[1]))]
  .filter((u) => !u.includes("asset-url") && !u.includes("fonts.g"));
if (ext.length) warns.push("external (non-hub) URLs — fine for rendering if public + range-requestable, but they can rot: " + ext.map((u) => u.slice(0, 60)).join(", "));

// 6. TRAP: render-video scans the WHOLE file for `in: N, out: N` pairs to score clip-cut coverage.
//    Any object literal other than SEGMENTS that matches fakes a segment and can cost you the cut.
const segLiteral = /const SEGMENTS\s*=\s*\[([\s\S]*?)\];/.exec(code);
const allPairs = [...code.matchAll(/["']?in["']?\s*:\s*([\d.]+)\s*,\s*["']?out["']?\s*:\s*([\d.]+)/g)];
const inSeg = segLiteral ? [...segLiteral[1].matchAll(/["']?in["']?\s*:\s*([\d.]+)\s*,\s*["']?out["']?\s*:\s*([\d.]+)/g)].map((m) => m[0]) : [];
const stray = allPairs.filter((m) => !inSeg.includes(m[0]));
ok(stray.length === 0, `render-video would see ${allPairs.length} "segments" but SEGMENTS declares ${inSeg.length} — rename the in/out keys in: ` + stray.map((m) => `${m[1]}–${m[2]}`).join(", "));
console.log("segment scan     OK ", allPairs.length + " pair(s), all inside SEGMENTS");

// 7. media element census (useCuts rewrites every <Video>/<Audio>)
const census = { Video: (code.match(/<Video\b/g) || []).length, Offthread: (code.match(/<OffthreadVideo\b/g) || []).length, Audio: (code.match(/<Audio\b/g) || []).length, Img: (code.match(/<Img\b/g) || []).length };
console.log("media elements   OK ", JSON.stringify(census));

// 8. safe areas + emoji QA hints
const emoji = [...new Set((code.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []))];
if (emoji.length) warns.push(`emoji in use (${emoji.join(" ")}) — verify on a still frame; prefer SVG/CSS glyphs for anything load-bearing`);
const bottomHits = [...code.matchAll(/top:\s*(1[5-9]\d\d|1[6-9]\d\d)\b/g)].map((m) => Number(m[1]));
if (bottomHits.length) warns.push("elements positioned below y1500 — keep anything critical above y1580 (YouTube UI): " + [...new Set(bottomHits)].join(", "));

console.log(warns.length ? "\nWARNINGS:\n - " + warns.join("\n - ") : "\nwarnings: none");
if (fails.length) { console.log("\nFAILURES:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("\nCHECK PASSED");
