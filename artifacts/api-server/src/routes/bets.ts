import { SubmitBetBody } from "@workspace/api-zod";
import { betsTable, db, groupsTable, matchesTable, teamsTable, usersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { requireAuth } from "../lib/auth";

const router = Router();

function getBettingDeadline(matchDate: Date): Date {
  return new Date(matchDate.getTime() - 30 * 60 * 1000);
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
    homePlaceholder: match.homePlaceholder ?? undefined,
    awayPlaceholder: match.awayPlaceholder ?? undefined,
    homeScore: match.homeScore ?? undefined,
    awayScore: match.awayScore ?? undefined,
    matchNumber: match.matchNumber ?? undefined,
    venue: match.venue ?? undefined,
    bettingDeadline: getBettingDeadline(match.matchDate),
  };
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
    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, matchId));
    if (!match) {
      res.status(404).json({ error: "Not found", message: "Match not found" });
      return;
    }

    if (new Date() > getBettingDeadline(match.matchDate)) {
      res.status(400).json({ error: "Bad request", message: "Betting deadline has passed for this match" });
      return;
    }

    const [existing] = await db.select().from(betsTable)
      .where(and(eq(betsTable.matchId, matchId), eq(betsTable.userId, userId)));

    let bet;
    if (existing) {
      [bet] = await db.update(betsTable)
        .set({ homeScore, awayScore, updatedAt: new Date() })
        .where(eq(betsTable.id, existing.id))
        .returning();
    } else {
      [bet] = await db.insert(betsTable).values({ userId, matchId, homeScore, awayScore }).returning();
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
    const bets = await db.select().from(betsTable).where(eq(betsTable.userId, userId));
    const result = await Promise.all(
      bets.map(async (b) => {
        const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, b.matchId));
        const enrichedMatch = match ? await enrichMatch(match) : undefined;
        return { ...b, match: enrichedMatch };
      })
    );
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get user bets");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/match/:matchId", requireAuth, async (req, res) => {
  const matchId = parseInt(req.params.matchId as string);
  if (isNaN(matchId)) {
    res.status(400).json({ error: "Bad request", message: "Invalid match ID" });
    return;
  }
  try {
    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, matchId));
    if (!match) {
      res.status(404).json({ error: "Not found", message: "Match not found" });
      return;
    }

    if (new Date() <= getBettingDeadline(match.matchDate)) {
      res.json([]);
      return;
    }

    const bets = await db.select().from(betsTable).where(eq(betsTable.matchId, matchId));
    const userIds = [...new Set(bets.map((b) => b.userId))];
    const users = await Promise.all(
      userIds.map((id) => db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, id)))
    );
    const userMap = Object.fromEntries(users.flat().map((u) => [u.id, u]));

    res.json(bets.map((b) => ({ ...b, user: userMap[b.userId] })));
  } catch (err) {
    req.log.error({ err }, "Failed to get match bets");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
