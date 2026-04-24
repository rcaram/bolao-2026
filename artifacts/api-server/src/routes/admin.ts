import {
  CreateGroupBody,
  CreateInviteBody,
  CreateMatchBody,
  CreateTeamBody,
  UpdateMatchResultBody,
} from "@workspace/api-zod";
import { betsTable, bolaoScoringConfigsTable, db, groupsTable, importSchedule, invitesTable, matchesTable, scoringConfigTable, teamsTable, usersTable } from "@workspace/db";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { requireAdmin } from "../lib/auth";
import { resolveKnockoutPlaceholder, resolveTeamFromPlaceholder, type MatchData } from "../lib/results";
import { calculateBetPoints, DEFAULT_SCORING_CONFIG, type ScoringConfig } from "../lib/scoring";
import { calculateGroupStandings, type TeamStanding } from "./standings";

const router = Router();
router.use(requireAdmin);

interface RouteLogger {
  info: (obj: unknown, msg: string) => void;
  error: (obj: unknown, msg: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getConfig(): Promise<ScoringConfig> {
  const [row] = await db.select().from(scoringConfigTable).where(eq(scoringConfigTable.id, 1));
  if (!row) return DEFAULT_SCORING_CONFIG;
  return {
    exactScore: row.exactScore,
    correctOutcomeGoalDiff: row.correctOutcomeGoalDiff,
    correctOutcome: row.correctOutcome,
    wrongOutcome: row.wrongOutcome,
    bonusChampion: row.bonusChampion,
    bonusTopScorer: row.bonusTopScorer,
  };
}

async function getConfigForBolao(bolaoId: number): Promise<ScoringConfig> {
  const [row] = await db
    .select()
    .from(bolaoScoringConfigsTable)
    .where(eq(bolaoScoringConfigsTable.bolaoId, bolaoId));
  if (!row) return getConfig();
  return {
    exactScore: row.exactScore,
    correctOutcomeGoalDiff: row.correctOutcomeGoalDiff,
    correctOutcome: row.correctOutcome,
    wrongOutcome: row.wrongOutcome,
    bonusChampion: row.bonusChampion,
    bonusTopScorer: row.bonusTopScorer,
  };
}

// ─── R32 Auto-Resolution ─────────────────────────────────────────────────────

/**
 * After a group-stage match is marked "finished", check whether any
 * Round-of-32 placeholder slots can be filled automatically.
 *
 * Placeholders follow these formats (set in import-schedule.ts):
 *   "Winner Group A"        → 1st in Group A
 *   "Runner-up Group A"     → 2nd in Group A
 *   "Best 3rd (A/B/C/D/F)"  → best 3rd-place team from those groups
 */
async function resolveR32Placeholders(logger: RouteLogger): Promise<void> {
  // 1. Get all groups and build a lookup name → id
  const groups = await db.select().from(groupsTable);
  const groupByName: Record<string, typeof groups[0]> = {};
  const groupById: Record<number, typeof groups[0]> = {};
  for (const g of groups) {
    groupByName[g.name] = g;
    groupById[g.id] = g;
  }

  // 2. Check which groups are fully completed
  const allGroupMatches = await db.select().from(matchesTable).where(eq(matchesTable.stage, "group"));
  const groupMatchesByGroupId: Record<number, typeof allGroupMatches> = {};
  for (const m of allGroupMatches) {
    if (!m.groupId) continue;
    if (!groupMatchesByGroupId[m.groupId]) groupMatchesByGroupId[m.groupId] = [];
    groupMatchesByGroupId[m.groupId].push(m);
  }

  const completedGroupIds = new Set<number>();
  for (const [gId, matches] of Object.entries(groupMatchesByGroupId)) {
    const groupId = Number(gId);
    if (matches.length > 0 && matches.every(m => m.status === "finished")) {
      completedGroupIds.add(groupId);
    }
  }

  if (completedGroupIds.size === 0) return;

  // 3. Calculate standings for completed groups
  const standingsByGroupName: Record<string, TeamStanding[]> = {};
  for (const gId of completedGroupIds) {
    const group = groupById[gId];
    if (!group) continue;
    standingsByGroupName[group.name] = await calculateGroupStandings(gId);
  }

  // 4. Get all R32 matches that still have unresolved placeholders
  const r32Matches = await db.select().from(matchesTable).where(eq(matchesTable.stage, "round_of_32"));

  for (const r32 of r32Matches) {
    let newHomeTeamId = r32.homeTeamId;
    let newAwayTeamId = r32.awayTeamId;

    // Resolve home placeholder
    if (!r32.homeTeamId && r32.homePlaceholder) {
      const resolved = resolveTeamFromPlaceholder(r32.homePlaceholder, standingsByGroupName, completedGroupIds, groupByName);
      if (resolved !== null) newHomeTeamId = resolved;
    }

    // Resolve away placeholder
    if (!r32.awayTeamId && r32.awayPlaceholder) {
      const resolved = resolveTeamFromPlaceholder(r32.awayPlaceholder, standingsByGroupName, completedGroupIds, groupByName);
      if (resolved !== null) newAwayTeamId = resolved;
    }

    // Update if anything changed
    if (newHomeTeamId !== r32.homeTeamId || newAwayTeamId !== r32.awayTeamId) {
      const updateVals: Partial<Pick<typeof matchesTable.$inferInsert, "homeTeamId" | "awayTeamId">> = {};
      if (newHomeTeamId !== r32.homeTeamId) updateVals.homeTeamId = newHomeTeamId;
      if (newAwayTeamId !== r32.awayTeamId) updateVals.awayTeamId = newAwayTeamId;

      await db.update(matchesTable).set(updateVals).where(eq(matchesTable.id, r32.id));
      logger.info(
        { matchNumber: r32.matchNumber, homeTeamId: newHomeTeamId, awayTeamId: newAwayTeamId },
        "R32 match teams auto-resolved"
      );
    }
  }
}

async function resolveKnockoutPlaceholders(logger: RouteLogger): Promise<void> {
  const allMatches = await db.select().from(matchesTable);
  const matchData: MatchData[] = allMatches.map((match) => ({
    matchNumber: match.matchNumber,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
  }));

  const nextRoundMatches = allMatches.filter((match) => (
    match.stage !== "group"
    && (
      (match.homeTeamId === null && match.homePlaceholder !== null)
      || (match.awayTeamId === null && match.awayPlaceholder !== null)
    )
  ));

  for (const nextRoundMatch of nextRoundMatches) {
    let newHomeTeamId = nextRoundMatch.homeTeamId;
    let newAwayTeamId = nextRoundMatch.awayTeamId;

    if (nextRoundMatch.homeTeamId === null && nextRoundMatch.homePlaceholder) {
      const resolved = resolveKnockoutPlaceholder(nextRoundMatch.homePlaceholder, matchData);
      if (resolved !== null) newHomeTeamId = resolved;
    }

    if (nextRoundMatch.awayTeamId === null && nextRoundMatch.awayPlaceholder) {
      const resolved = resolveKnockoutPlaceholder(nextRoundMatch.awayPlaceholder, matchData);
      if (resolved !== null) newAwayTeamId = resolved;
    }

    if (newHomeTeamId !== nextRoundMatch.homeTeamId || newAwayTeamId !== nextRoundMatch.awayTeamId) {
      const updateValues: Partial<Pick<typeof matchesTable.$inferInsert, "homeTeamId" | "awayTeamId">> = {};
      if (newHomeTeamId !== nextRoundMatch.homeTeamId) updateValues.homeTeamId = newHomeTeamId;
      if (newAwayTeamId !== nextRoundMatch.awayTeamId) updateValues.awayTeamId = newAwayTeamId;

      await db.update(matchesTable).set(updateValues).where(eq(matchesTable.id, nextRoundMatch.id));
      logger.info(
        { matchNumber: nextRoundMatch.matchNumber, homeTeamId: newHomeTeamId, awayTeamId: newAwayTeamId },
        "Knockout match teams auto-resolved"
      );
    }
  }
}



// ─── Scoring Config ──────────────────────────────────────────────────────────

router.get("/scoring-config", async (req, res) => {
  try {
    res.json(await getConfig());
  } catch (err) {
    req.log.error({ err }, "Failed to get scoring config");
    res.status(500).json({ error: "Internal server error" });
  }
});

function parseScoringConfigBody(body: unknown): ScoringConfig | null {
  if (typeof body !== "object" || body === null) return null;
  const bodyRecord = body as Record<string, unknown>;
  const fields: (keyof ScoringConfig)[] = ["exactScore", "correctOutcomeGoalDiff", "correctOutcome", "wrongOutcome", "bonusChampion", "bonusTopScorer"];
  const result: Partial<ScoringConfig> = {};
  for (const f of fields) {
    const v = Number(bodyRecord[f]);
    if (!Number.isInteger(v) || v < 0) return null;
    result[f] = v;
  }
  return result as ScoringConfig;
}

router.put("/scoring-config", async (req, res) => {
  const data = parseScoringConfigBody(req.body);
  if (!data) {
    res.status(400).json({ error: "Bad request", message: "Invalid scoring config — all fields must be non-negative integers" });
    return;
  }
  try {
    const [existing] = await db.select({ id: scoringConfigTable.id }).from(scoringConfigTable).where(eq(scoringConfigTable.id, 1));
    if (existing) {
      await db.update(scoringConfigTable).set({ ...data, updatedAt: new Date() }).where(eq(scoringConfigTable.id, 1));
    } else {
      await db.insert(scoringConfigTable).values({ id: 1, ...data });
    }
    res.json(await getConfig());
  } catch (err) {
    req.log.error({ err }, "Failed to update scoring config");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Invites ─────────────────────────────────────────────────────────────────

router.post("/invite", async (req, res) => {
  const parsed = CreateInviteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: "Invalid request body" });
    return;
  }
  const { email, expiresInDays } = parsed.data;
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + (expiresInDays ?? 7) * 24 * 60 * 60 * 1000);
  try {
    const [invite] = await db.insert(invitesTable).values({ email, token, expiresAt }).returning();
    const baseUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : "http://localhost";
    res.status(201).json({ invite, inviteUrl: `${baseUrl}/register?token=${token}` });
  } catch (err) {
    req.log.error({ err }, "Failed to create invite");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/invites", async (req, res) => {
  try {
    res.json(await db.select().from(invitesTable));
  } catch (err) {
    req.log.error({ err }, "Failed to list invites");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Groups & Teams ───────────────────────────────────────────────────────────

router.post("/groups", async (req, res) => {
  const parsed = CreateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: "Invalid request body" });
    return;
  }
  try {
    const [group] = await db.insert(groupsTable).values(parsed.data).returning();
    res.status(201).json(group);
  } catch (err) {
    req.log.error({ err }, "Failed to create group");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/teams", async (req, res) => {
  const parsed = CreateTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: "Invalid request body" });
    return;
  }
  try {
    const data = parsed.data;
    const [team] = await db
      .insert(teamsTable)
      .values({
        name: data.name,
        flag: data.flag ?? null,
        fifaCode: data.fifaCode,
        groupId: data.groupId ?? null,
      })
      .returning();

    let group = undefined;
    if (team.groupId) {
      [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, team.groupId));
    }
    res.status(201).json({ ...team, flag: team.flag ?? undefined, groupId: team.groupId ?? undefined, group });
  } catch (err) {
    req.log.error({ err }, "Failed to create team");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Matches ─────────────────────────────────────────────────────────────────

router.post("/matches", async (req, res) => {
  const parsed = CreateMatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: "Invalid request body" });
    return;
  }
  try {
    const data = parsed.data;
    const [match] = await db
      .insert(matchesTable)
      .values({
        homeTeamId: data.homeTeamId ?? null,
        awayTeamId: data.awayTeamId ?? null,
        homePlaceholder: data.homePlaceholder ?? null,
        awayPlaceholder: data.awayPlaceholder ?? null,
        groupId: data.groupId ?? null,
        matchDate: new Date(data.matchDate),
        stage: data.stage,
        matchNumber: data.matchNumber ?? null,
        venue: data.venue ?? null,
      })
      .returning();

    res.status(201).json({
      ...match,
      bettingDeadline: new Date(match.matchDate.getTime() - 30 * 60 * 1000),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create match");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/matches/:matchId/result", async (req, res) => {
  const matchId = parseInt(req.params.matchId);
  if (isNaN(matchId)) {
    res.status(400).json({ error: "Bad request", message: "Invalid match ID" });
    return;
  }
  const parsed = UpdateMatchResultBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: "Invalid request body" });
    return;
  }
  const { homeScore, awayScore, status, homeTeamId, awayTeamId } = parsed.data;
  try {
    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, matchId));
    if (!match) {
      res.status(404).json({ error: "Not found", message: "Match not found" });
      return;
    }

    const updateValues: Partial<Pick<typeof matchesTable.$inferInsert, "homeScore" | "awayScore" | "status" | "homeTeamId" | "awayTeamId">> = { homeScore, awayScore, status };
    if (homeTeamId !== undefined) updateValues.homeTeamId = homeTeamId;
    if (awayTeamId !== undefined) updateValues.awayTeamId = awayTeamId;

    const [updatedMatch] = await db
      .update(matchesTable)
      .set(updateValues)
      .where(eq(matchesTable.id, matchId))
      .returning();

    if (status === "finished") {
      const bets = await db.select().from(betsTable).where(eq(betsTable.matchId, matchId));
      const configCache = new Map<number, ScoringConfig>();
      for (const bet of bets) {
        let config = configCache.get(bet.bolaoId);
        if (!config) {
          config = await getConfigForBolao(bet.bolaoId);
          configCache.set(bet.bolaoId, config);
        }
        const scored = calculateBetPoints(bet.homeScore, bet.awayScore, homeScore, awayScore, config);
        await db.update(betsTable).set({
          points: scored.points,
          exactScore: scored.exactScore,
          correctOutcome: scored.correctOutcome,
          correctGoalDiff: scored.correctGoalDiff,
          updatedAt: new Date(),
        }).where(eq(betsTable.id, bet.id));
      }

      // Auto-resolve R32 placeholders when group-stage matches finish
      if (updatedMatch.stage === "group") {
        try {
          await resolveR32Placeholders(req.log);
        } catch (resolveErr) {
          req.log.error({ err: resolveErr }, "Failed to auto-resolve R32 placeholders (non-fatal)");
        }
      } else {
        try {
          await resolveKnockoutPlaceholders(req.log);
        } catch (resolveErr) {
          req.log.error({ err: resolveErr }, "Failed to auto-resolve knockout placeholders (non-fatal)");
        }
      }
    }

    res.json({
      ...updatedMatch,
      bettingDeadline: new Date(updatedMatch.matchDate.getTime() - 30 * 60 * 1000),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update match result");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Import Schedule ─────────────────────────────────────────────────────────

router.post("/import-schedule", async (req, res) => {
  try {
    const result = await importSchedule();
    res.json({
      message: "FIFA 2026 schedule imported successfully",
      ...result,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to import schedule");
    res.status(500).json({ error: "Internal server error", message: String(err) });
  }
});

// ─── Users ────────────────────────────────────────────────────────────────────

router.get("/users", async (req, res) => {
  try {
    const users = await db.select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role }).from(usersTable);
    const allBets = await db.select({ userId: betsTable.userId, points: betsTable.points }).from(betsTable);
    const result = users.map((u) => {
      const userBets = allBets.filter((b) => b.userId === u.id);
      return { ...u, totalPoints: userBets.reduce((s, b) => s + b.points, 0), betsSubmitted: userBets.length };
    });
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list users");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
