import { Router } from "express";
import { db, usersTable, betsTable, matchesTable, bonusBetsTable, teamsTable, groupsTable, bolaoMembersTable } from "@workspace/db";
import { and, eq, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getBolaoIdFromParams, requireBolaoMember } from "../lib/bolao-auth";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireBolaoMember);

async function buildRankings(bolaoId: number) {
  const users = await db
    .select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable)
    .innerJoin(bolaoMembersTable, eq(usersTable.id, bolaoMembersTable.userId))
    .where(eq(bolaoMembersTable.bolaoId, bolaoId));
  const allBets = await db.select().from(betsTable).where(eq(betsTable.bolaoId, bolaoId));
  const allBonusBets = await db.select().from(bonusBetsTable).where(eq(bonusBetsTable.bolaoId, bolaoId));
  const [{ value: totalMatches }] = await db.select({ value: count() }).from(matchesTable);

  const bonusMap: Record<number, { championPoints: number; topScorerPoints: number }> = {};
  allBonusBets.forEach((b) => {
    bonusMap[b.userId] = { championPoints: b.championPoints, topScorerPoints: b.topScorerPoints };
  });

  const userStats = users.map((u) => {
    const userBets = allBets.filter((b) => b.userId === u.id);
    const matchPoints = userBets.reduce((sum, b) => sum + b.points, 0);
    const bonus = bonusMap[u.id] ?? { championPoints: 0, topScorerPoints: 0 };
    const bonusPoints = bonus.championPoints + bonus.topScorerPoints;
    return {
      userId: u.id,
      userName: u.name,
      totalPoints: matchPoints + bonusPoints,
      exactScores: userBets.filter((b) => b.exactScore).length,
      correctOutcomes: userBets.filter((b) => b.correctOutcome).length,
      bonusPoints,
      betsSubmitted: userBets.length,
      totalMatches: Number(totalMatches),
    };
  });

  userStats.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
    if (b.correctOutcomes !== a.correctOutcomes) return b.correctOutcomes - a.correctOutcomes;
    return b.betsSubmitted - a.betsSubmitted;
  });

  return userStats.map((u, i) => ({ rank: i + 1, ...u }));
}

async function enrichMatch(match: any) {
  const homeTeam = match.homeTeamId
    ? (await db.select().from(teamsTable).where(eq(teamsTable.id, match.homeTeamId)))[0]
    : null;
  const awayTeam = match.awayTeamId
    ? (await db.select().from(teamsTable).where(eq(teamsTable.id, match.awayTeamId)))[0]
    : null;
  const group = match.groupId
    ? (await db.select().from(groupsTable).where(eq(groupsTable.id, match.groupId)))[0]
    : null;
  return {
    ...match,
    homeTeam: homeTeam ?? undefined,
    awayTeam: awayTeam ?? undefined,
    group: group ?? undefined,
    bettingDeadline: new Date(match.matchDate.getTime() - 30 * 60 * 1000),
  };
}

router.get("/", async (req, res) => {
  const bolaoId = getBolaoIdFromParams(req);
  if (!bolaoId) {
    res.status(400).json({ error: "Bad request", message: "Invalid bolao ID" });
    return;
  }
  try {
    res.json(await buildRankings(bolaoId));
  } catch (err) {
    req.log.error({ err }, "Failed to get rankings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/my", async (req, res) => {
  const userId = req.session.userId!;
  const bolaoId = getBolaoIdFromParams(req);
  if (!bolaoId) {
    res.status(400).json({ error: "Bad request", message: "Invalid bolao ID" });
    return;
  }
  try {
    const rankings = await buildRankings(bolaoId);
    const myRank = rankings.find((r) => r.userId === userId);
    if (!myRank) {
      res.status(404).json({ error: "Not found", message: "User not in rankings" });
      return;
    }

    const bets = await db
      .select()
      .from(betsTable)
      .where(and(eq(betsTable.userId, userId), eq(betsTable.bolaoId, bolaoId)));
    const recentBets = await Promise.all(
      bets.map(async (b) => {
        const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, b.matchId));
        const enrichedMatch = match ? await enrichMatch(match) : undefined;
        return { ...b, match: enrichedMatch };
      })
    );

    res.json({ ...myRank, recentBets });
  } catch (err) {
    req.log.error({ err }, "Failed to get user ranking");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
