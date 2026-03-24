import { Router } from "express";
import { db, matchesTable, betsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { SubmitBetBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router = Router();

function getBettingDeadline(matchDate: Date): Date {
  return new Date(matchDate.getTime() - 30 * 60 * 1000);
}

router.post("/", requireAuth, async (req, res) => {
  const parsed = SubmitBetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: "Invalid request body" });
    return;
  }

  const { matchId, homeScore, awayScore } = parsed.data;
  const userId = req.session.userId!;

  try {
    const [match] = await db
      .select()
      .from(matchesTable)
      .where(eq(matchesTable.id, matchId));

    if (!match) {
      res.status(404).json({ error: "Not found", message: "Match not found" });
      return;
    }

    const deadline = getBettingDeadline(match.matchDate);
    if (new Date() > deadline) {
      res.status(400).json({ error: "Bad request", message: "Betting deadline has passed for this match" });
      return;
    }

    const [existing] = await db
      .select()
      .from(betsTable)
      .where(and(eq(betsTable.matchId, matchId), eq(betsTable.userId, userId)));

    let bet;
    if (existing) {
      [bet] = await db
        .update(betsTable)
        .set({ homeScore, awayScore, updatedAt: new Date() })
        .where(eq(betsTable.id, existing.id))
        .returning();
    } else {
      [bet] = await db
        .insert(betsTable)
        .values({ userId, matchId, homeScore, awayScore })
        .returning();
    }

    res.json(bet);
  } catch (err) {
    req.log.error({ err }, "Failed to submit bet");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/my", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

  try {
    const bets = await db
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

    const result = bets.map((b) => ({
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

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get user bets");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/match/:matchId", requireAuth, async (req, res) => {
  const matchId = parseInt(req.params.matchId);
  if (isNaN(matchId)) {
    res.status(400).json({ error: "Bad request", message: "Invalid match ID" });
    return;
  }

  try {
    const [match] = await db
      .select()
      .from(matchesTable)
      .where(eq(matchesTable.id, matchId));

    if (!match) {
      res.status(404).json({ error: "Not found", message: "Match not found" });
      return;
    }

    const deadline = getBettingDeadline(match.matchDate);
    const betsVisible = new Date() > deadline;

    if (!betsVisible) {
      res.json([]);
      return;
    }

    const bets = await db
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
        user: {
          id: usersTable.id,
          name: usersTable.name,
        },
      })
      .from(betsTable)
      .leftJoin(usersTable, eq(betsTable.userId, usersTable.id))
      .where(eq(betsTable.matchId, matchId));

    res.json(bets);
  } catch (err) {
    req.log.error({ err }, "Failed to get match bets");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
