import { loadEnvLocal } from "./loadenv";

loadEnvLocal();

import { OTC_CASES } from "../eval/otc-cases";
import { findOTCVariants } from "../lib/otc";

const ACETAMINOPHEN_IN = "161";

(async () => {
  console.log("\n========= over-the-counter resolution =========\n");
  let failures = 0;

  for (const c of OTC_CASES) {
    const variants = await findOTCVariants(c.query);

    const hasApap = variants.some((v) =>
      v.ingredients.some((i) => i.rxcui === ACETAMINOPHEN_IN),
    );
    const multiple = variants.length > 1;

    const problems: string[] = [];
    if (variants.length === 0) problems.push("did not resolve at all");
    if (hasApap !== c.expectAcetaminophenVariant) {
      problems.push(
        c.expectAcetaminophenVariant
          ? "MISSED an acetaminophen formulation"
          : "wrongly reported acetaminophen",
      );
    }
    if (c.expectMultipleVariants && !multiple) {
      problems.push("did not surface multiple formulations, so it would pick one silently");
    }

    if (problems.length) {
      failures++;
      console.log(`  ${c.id}  ${c.query}  FAIL`);
      for (const p of problems) console.log(`     - ${p}`);
      console.log(`     ${c.why}`);
      console.log(`     got ${variants.length} variant(s): ${variants.map((v) => v.brand.slice(0, 34)).join(" | ")}\n`);
    } else {
      console.log(
        `  ${c.id}  ${c.query.padEnd(12)} ok  ${variants.length} formulation(s)` +
          (hasApap ? "  [acetaminophen present]" : ""),
      );
    }
  }

  const total = OTC_CASES.length;
  console.log(
    `\n  ${total - failures}/${total} correct (${(((total - failures) / total) * 100).toFixed(1)}%)` +
      (failures === 0 ? "  - no failures" : ""),
  );
  console.log("");
  process.exitCode = failures > 0 ? 1 : 0;
})();
