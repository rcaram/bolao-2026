import { Router } from "express";
import { db, matchesTable, betsTable, teamsTable, groupsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { GetMatchesQueryParams } from "@workspace/api-zod";

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

router.get("/", async (req, res) => {
  try {
    const queryParsed = GetMatchesQueryParams.safeParse(req.query);
    const { stage, status, groupId, bolaoId } = queryParsed.success ? queryParsed.data : {};

    const conditions = [];
    if (stage) conditions.push(eq(matchesTable.stage, stage as any));
    if (status) conditions.push(eq(matchesTable.status, status as any));
    if (groupId) conditions.push(eq(matchesTable.groupId, groupId));

    const matches = conditions.length > 0
      ? await db.select().from(matchesTable).where(and(...conditions))
      : await db.select().from(matchesTable);

    const userId = req.session?.userId;
    let userBetsMap: Record<number, any> = {};
    if (userId && bolaoId) {
      const userBets = await db
        .select()
        .from(betsTable)
        .where(and(eq(betsTable.userId, userId), eq(betsTable.bolaoId, bolaoId)));
      userBets.forEach((b) => { userBetsMap[b.matchId] = b; });
    }

    const enriched = await Promise.all(matches.map(enrichMatch));
    const result = enriched.map((m) => ({ ...m, userBet: userBetsMap[m.id] ?? undefined }));

    res.json(result);
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

    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, matchId));
    if (!match) {
      res.status(404).json({ error: "Not found", message: "Match not found" });
      return;
    }

    const enriched = await enrichMatch(match);

    const userId = req.session?.userId;
    const parsedBolaoId = Number.parseInt((req.query.bolaoId as string | undefined) ?? "", 10);
    const bolaoId = Number.isNaN(parsedBolaoId) ? null : parsedBolaoId;
    let userBet = undefined;
    if (userId && bolaoId) {
      const [bet] = await db.select().from(betsTable)
        .where(and(eq(betsTable.matchId, matchId), eq(betsTable.userId, userId), eq(betsTable.bolaoId, bolaoId)));
      userBet = bet;
    }

    res.json({ ...enriched, userBet });
  } catch (err) {
    req.log.error({ err }, "Failed to get match");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
