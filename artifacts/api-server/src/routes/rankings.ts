import { Router } from "express";
import { db, usersTable, betsTable, matchesTable, bonusBetsTable } from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

async function buildRankings() {
  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
    })
    .from(usersTable);

  const allBets = await db.select().from(betsTable);
  const allBonusBets = await db.select().from(bonusBetsTable);
  const totalMatches = (await db.select({ count: count() }).from(matchesTable))[0]?.count ?? 0;

  const bonusMap: Record<number, { championPoints: number; topScorerPoints: number }> = {};
  allBonusBets.forEach((b) => {
    bonusMap[b.userId] = {
      championPoints: b.championPoints,
      topScorerPoints: b.topScorerPoints,
    };
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
    if (b.betsSubmitted !== a.betsSubmitted) return b.betsSubmitted - a.betsSubmitted;
    return 0;
  });

  return userStats.map((u, i) => ({ rank: i + 1, ...u }));
}

router.get("/", async (req, res) => {
  try {
    const rankings = await buildRankings();
    res.json(rankings);
  } catch (err) {
    req.log.error({ err }, "Failed to get rankings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/my", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  try {
    const rankings = await buildRankings();
    const myRank = rankings.find((r) => r.userId === userId);

    if (!myRank) {
      res.status(404).json({ error: "Not found", message: "User not in rankings" });
      return;
    }

    const recentBets = await db
      .select({
        id: betsTable.id,
        userId: betsTable.userId,
        matchId: betsTable.matchId,
        homeScore: betsTable.homeScore,
        awayScore: betsTable.awayScore,
        points: betsTable.points,
        exactScore: betsTable.exactScore,
        correctOutcome: betsTable.correctOutcome,
        correctGoalDiff: betsTable.correctGoalDiff,
        createdAt: betsTable.createdAt,
        updatedAt: betsTable.updatedAt,
        match: {
          id: matchesTable.id,
          homeTeam: matchesTable.homeTeam,
          awayTeam: matchesTable.awayTeam,
          homeTeamFlag: matchesTable.homeTeamFlag,
          awayTeamFlag: matchesTable.awayTeamFlag,
          matchDate: matchesTable.matchDate,
          stage: matchesTable.stage,
          groupName: matchesTable.groupName,
          venue: matchesTable.venue,
          homeScore: matchesTable.homeScore,
          awayScore: matchesTable.awayScore,
          status: matchesTable.status,
          createdAt: matchesTable.createdAt,
        },
      })
      .from(betsTable)
      .leftJoin(matchesTable, eq(betsTable.matchId, matchesTable.id))
      .where(eq(betsTable.userId, userId));

    const recentBetsFormatted = recentBets.map((b) => ({
      ...b,
      match: b.match
        ? {
            ...b.match,
            homeTeamFlag: b.match.homeTeamFlag ?? undefined,
            awayTeamFlag: b.match.awayTeamFlag ?? undefined,
            groupName: b.match.groupName ?? undefined,
            venue: b.match.venue ?? undefined,
            homeScore: b.match.homeScore ?? undefined,
            awayScore: b.match.awayScore ?? undefined,
            bettingDeadline: new Date(b.match.matchDate.getTime() - 30 * 60 * 1000),
          }
        : undefined,
    }));

    res.json({ ...myRank, recentBets: recentBetsFormatted });
  } catch (err) {
    req.log.error({ err }, "Failed to get user ranking");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
