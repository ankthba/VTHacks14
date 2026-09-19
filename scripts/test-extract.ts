/**
 * Test the vision pipeline against real photographs.
 *
 *   npx tsx scripts/test-extract.ts photo1.jpg [photo2.jpg ...]
 *   npx tsx scripts/test-extract.ts --discharge paperwork.jpg
 *
 * Needs GEMINI_API_KEY (or ANTHROPIC_API_KEY) in the environment. Prints what
 * was read off each label, then runs the full pipeline over it so you can see
 * whether extraction feeds the checks correctly - a plausible-looking JSON blob
 * that resolves to nothing is the failure mode worth catching.
 */
import { promises as fs } from "fs";
import path from "path";
import { extractFromImages } from "../lib/extract";
import { activeProvider, type ImagePart } from "../lib/llm";
import { normalizeAll } from "../lib/normalize";
import { deterministicFindings, sortFindings } from "../lib/analyze";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
};

(async () => {
  const args = process.argv.slice(2);
  const discharge = args.includes("--discharge");
  const files = args.filter((a) => !a.startsWith("--"));

  if (files.length === 0) {
    console.error("usage: tsx scripts/test-extract.ts [--discharge] <image> [image...]");
    process.exitCode = 1;
    return;
  }
  if (activeProvider() === "none") {
    console.error("No provider configured. Set GEMINI_API_KEY in .env.local or the environment.");
    process.exitCode = 1;
    return;
  }
  console.log(`provider: ${activeProvider()}\n`);

  const images: ImagePart[] = [];
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    const mimeType = MIME[ext];
    if (!mimeType) {
      console.error(`unsupported image type: ${f}`);
      process.exitCode = 1;
      return;
    }
    images.push({ mimeType, data: (await fs.readFile(f)).toString("base64") });
  }

  const t0 = Date.now();
  const records = await extractFromImages(images, discharge ? "discharge" : "bottles");
  console.log(`--- extracted ${records.length} record(s) in ${Date.now() - t0}ms ---\n`);
  for (const r of records) {
    console.log(`  ${r.drug_text ?? "(unreadable)"}  ${r.strength ?? ""}`);
    console.log(`     sig: ${r.sig ?? "(none)"}`);
    console.log(`     qty: ${r.quantity ?? "-"}  prescriber: ${r.prescriber ?? "-"}  filled: ${r.fill_date ?? "-"}`);
    console.log(`     confidence: ${r.confidence}\n`);
  }

  console.log("--- normalization ---\n");
  const meds = await normalizeAll(records);
  for (const m of meds) {
    console.log(
      `  ${m.input_text} -> ${m.canonical_name ?? "UNRESOLVED"}` +
        (m.discontinued ? "  [discontinued brand]" : ""),
    );
    console.log(`     ingredients: ${m.ingredients.map((i) => i.name).join(" + ") || "(none)"}`);
  }

  console.log("\n--- findings ---\n");
  const findings = sortFindings(deterministicFindings(meds));
  if (findings.length === 0) console.log("  (none)");
  for (const f of findings) console.log(`  [${f.severity}] ${f.kind}: ${f.headline}`);

  const bad = meds.filter((m) => m.unresolved);
  if (bad.length) {
    console.log(`\n  WARNING: ${bad.length} medication(s) did not resolve and were excluded:`);
    for (const m of bad) console.log(`    - "${m.input_text}"`);
  }
  console.log("");
})();
