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
import { reconcile } from "../lib/reconcile";

(async () => {
  for (const s of SCENARIOS) {
    process.stdout.write(`  ${s.id.padEnd(12)} `);
    const meds = await normalizeAll(s.bottles);
    // The discharge list must be warmed too, or reconciliation misses offline.
    const dis = s.discharge ? await normalizeAll(s.discharge) : [];
    if (dis.length) {
      await summarizeMeds(dis);
      reconcile(dis, meds);
    }
    const computed = deterministicFindings(meds);
    const retrieved = await labelInteractions(meds);
    await summarizeMeds(meds);
    buildSchedule(meds);
    const unresolved = [...meds, ...dis]
      .filter((m) => m.unresolved)
      .map((m) => m.input_text);
    console.log(
      `${meds.length} meds${dis.length ? ` + ${dis.length} discharge` : ""}, ` +
        `${computed.length + retrieved.length} findings` +
        (unresolved.length ? `  UNRESOLVED: ${unresolved.join(", ")}` : ""),
    );
  }
  console.log("\nCache is warm. Commit the .cache/ directory.");
})();
