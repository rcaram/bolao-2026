import { Router } from "express";
import { db, matchesTable, betsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { GetMatchesQueryParams } from "@workspace/api-zod";

const router = Router();

function getBettingDeadline(matchDate: Date): Date {
  return new Date(matchDate.getTime() - 30 * 60 * 1000);
}

router.get("/", async (req, res) => {
  try {
    const queryParsed = GetMatchesQueryParams.safeParse(req.query);
    const { stage, status } = queryParsed.success ? queryParsed.data : {};

    let query = db.select().from(matchesTable);

    const conditions = [];
    if (stage) conditions.push(eq(matchesTable.stage, stage as any));
    if (status) conditions.push(eq(matchesTable.status, status as any));

    const matches = conditions.length > 0
      ? await db.select().from(matchesTable).where(and(...conditions))
      : await db.select().from(matchesTable);

    const userId = req.session?.userId;
    let userBetsMap: Record<number, any> = {};

    if (userId) {
      const userBets = await db
        .select()
        .from(betsTable)
        .where(eq(betsTable.userId, userId));
      userBets.forEach((b) => {
        userBetsMap[b.matchId] = b;
      });
    }

    const matchesWithBets = matches.map((m) => ({
      ...m,
      homeTeamFlag: m.homeTeamFlag ?? undefined,
      awayTeamFlag: m.awayTeamFlag ?? undefined,
      groupName: m.groupName ?? undefined,
      venue: m.venue ?? undefined,
      homeScore: m.homeScore ?? undefined,
      awayScore: m.awayScore ?? undefined,
      bettingDeadline: getBettingDeadline(m.matchDate),
      userBet: userBetsMap[m.id] ?? undefined,
    }));

    res.json(matchesWithBets);
  } catch (err) {
    req.log.error({ err }, "Failed to get matches");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:matchId", async (req, res) => {
  try {
    const matchId = parseInt(req.params.matchId);
    if (isNaN(matchId)) {
      res.status(400).json({ error: "Bad request", message: "Invalid match ID" });
      return;
    }

    const [match] = await db
      .select()
      .from(matchesTable)
      .where(eq(matchesTable.id, matchId));

    if (!match) {
      res.status(404).json({ error: "Not found", message: "Match not found" });
      return;
    }

    const userId = req.session?.userId;
    let userBet = undefined;

    if (userId) {
      const [bet] = await db
        .select()
        .from(betsTable)
        .where(and(eq(betsTable.matchId, matchId), eq(betsTable.userId, userId)));
      userBet = bet;
    }

    res.json({
      ...match,
      homeTeamFlag: match.homeTeamFlag ?? undefined,
      awayTeamFlag: match.awayTeamFlag ?? undefined,
      groupName: match.groupName ?? undefined,
      venue: match.venue ?? undefined,
      homeScore: match.homeScore ?? undefined,
      awayScore: match.awayScore ?? undefined,
      bettingDeadline: getBettingDeadline(match.matchDate),
      userBet,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get match");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
