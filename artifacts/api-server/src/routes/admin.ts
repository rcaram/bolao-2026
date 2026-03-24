import { Router } from "express";
import crypto from "crypto";
import { db, invitesTable, matchesTable, betsTable, usersTable, teamsTable, groupsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateInviteBody,
  CreateMatchBody,
  UpdateMatchResultBody,
  CreateGroupBody,
  CreateTeamBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";
import { calculateBetPoints } from "../lib/scoring";

const router = Router();
router.use(requireAdmin);

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

    const updateValues: Record<string, any> = { homeScore, awayScore, status };
    if (homeTeamId !== undefined) updateValues.homeTeamId = homeTeamId;
    if (awayTeamId !== undefined) updateValues.awayTeamId = awayTeamId;

    const [updatedMatch] = await db
      .update(matchesTable)
      .set(updateValues)
      .where(eq(matchesTable.id, matchId))
      .returning();

    if (status === "finished") {
      const bets = await db.select().from(betsTable).where(eq(betsTable.matchId, matchId));
      for (const bet of bets) {
        const scored = calculateBetPoints(bet.homeScore, bet.awayScore, homeScore, awayScore);
        await db.update(betsTable).set({
          points: scored.points,
          exactScore: scored.exactScore,
          correctOutcome: scored.correctOutcome,
          correctGoalDiff: scored.correctGoalDiff,
          updatedAt: new Date(),
        }).where(eq(betsTable.id, bet.id));
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
