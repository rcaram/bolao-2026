import { importSchedule } from "@workspace/db";

async function main() {
  console.log("🚀 FIFA World Cup 2026 – Importing schedule...\n");
  const result = await importSchedule();
  console.log("✅ Import complete!");
  console.log(`   Groups:        ${result.groups}`);
  console.log(`   Teams:         ${result.teams} (6 TBD playoff slots)`);
  console.log(`   Group matches: ${result.groupMatches}`);
  console.log(`   R32 matches:   ${result.r32Matches}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
