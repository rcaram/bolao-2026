import {
  bolaoMembersTable,
  boloesTable,
  bolaoScoringConfigsTable,
  bonusBetsTable,
  db,
  invitesTable,
  scoringConfigTable,
  usersTable,
  betsTable,
} from "@workspace/db";
import { eq, isNull } from "drizzle-orm";

async function backfillBoloes() {
  const [defaultBolao] = await db.select().from(boloesTable).where(eq(boloesTable.name, "Bolao Principal"));
  const [creator] = await db.select({ id: usersTable.id }).from(usersTable).limit(1);

  if (!creator) {
    throw new Error("No users found. Cannot create default bolao.");
  }

  const bolao =
    defaultBolao ??
    (
      await db
        .insert(boloesTable)
        .values({
          name: "Bolao Principal",
          description: "Bolao legado migrado automaticamente",
          inviteCode: "default-bolao",
          createdBy: creator.id,
        })
        .returning()
    )[0];

  const users = await db.select({ id: usersTable.id, role: usersTable.role }).from(usersTable);
  for (const user of users) {
    const [existing] = await db
      .select({ id: bolaoMembersTable.id })
      .from(bolaoMembersTable)
      .where(eq(bolaoMembersTable.userId, user.id));
    if (!existing) {
      await db.insert(bolaoMembersTable).values({
        bolaoId: bolao.id,
        userId: user.id,
        role: user.role === "admin" ? "admin" : "member",
      });
    }
  }

  const [legacyScoring] = await db.select().from(scoringConfigTable).where(eq(scoringConfigTable.id, 1));
  const [existingConfig] = await db
    .select({ id: bolaoScoringConfigsTable.id })
    .from(bolaoScoringConfigsTable)
    .where(eq(bolaoScoringConfigsTable.bolaoId, bolao.id));
  if (!existingConfig) {
    await db.insert(bolaoScoringConfigsTable).values({
      bolaoId: bolao.id,
      exactScore: legacyScoring?.exactScore ?? 10,
      correctOutcomeGoalDiff: legacyScoring?.correctOutcomeGoalDiff ?? 7,
      correctOutcome: legacyScoring?.correctOutcome ?? 5,
      wrongOutcome: legacyScoring?.wrongOutcome ?? 0,
      bonusChampion: legacyScoring?.bonusChampion ?? 15,
      bonusTopScorer: legacyScoring?.bonusTopScorer ?? 10,
    });
  }

  await db.update(betsTable).set({ bolaoId: bolao.id }).where(isNull(betsTable.bolaoId));
  await db.update(bonusBetsTable).set({ bolaoId: bolao.id }).where(isNull(bonusBetsTable.bolaoId));
  await db.update(invitesTable).set({ bolaoId: bolao.id }).where(isNull(invitesTable.bolaoId));

  console.log(`Backfill finished for bolao #${bolao.id}`);
}

backfillBoloes()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
