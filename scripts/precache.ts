/**
 * Demo-day resilience: walk every fixture scenario through the full pipeline so
 * that every RxNorm and openFDA response lands in .cache/, which is committed.
 * Run this before the demo, then verify with `npm run verify:offline`.
 */
import { SCENARIOS } from "../lib/fixtures";
import { normalizeAll } from "../lib/normalize";
import { deterministicFindings, buildSchedule } from "../lib/analyze";
import { labelInteractions } from "../lib/interactions";
import { summarizeMeds } from "../lib/onepager";

(async () => {
  for (const s of SCENARIOS) {
    process.stdout.write(`  ${s.id.padEnd(12)} `);
    const meds = await normalizeAll(s.bottles);
    const computed = deterministicFindings(meds);
    const retrieved = await labelInteractions(meds);
    await summarizeMeds(meds);
    buildSchedule(meds);
    const unresolved = meds.filter((m) => m.unresolved).map((m) => m.input_text);
    console.log(
      `${meds.length} meds, ${computed.length + retrieved.length} findings` +
        (unresolved.length ? `  UNRESOLVED: ${unresolved.join(", ")}` : ""),
    );
  }
  console.log("\nCache is warm. Commit the .cache/ directory.");
})();
