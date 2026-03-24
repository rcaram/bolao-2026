import { Router } from "express";
import crypto from "crypto";
import { db, invitesTable, matchesTable, betsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateInviteBody, CreateMatchBody, UpdateMatchResultBody } from "@workspace/api-zod";
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
    const [invite] = await db
      .insert(invitesTable)
      .values({ email, token, expiresAt })
      .returning();

    const baseUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : "http://localhost";

    res.status(201).json({
      invite,
      inviteUrl: `${baseUrl}/register?token=${token}`,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create invite");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/invites", async (req, res) => {
  try {
    const invites = await db.select().from(invitesTable);
    res.json(invites);
  } catch (err) {
    req.log.error({ err }, "Failed to list invites");
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
        homeTeam: data.homeTeam,
        awayTeam: data.awayTeam,
        homeTeamFlag: data.homeTeamFlag ?? null,
        awayTeamFlag: data.awayTeamFlag ?? null,
        matchDate: new Date(data.matchDate),
        stage: data.stage,
        groupName: data.groupName ?? null,
        venue: data.venue ?? null,
      })
      .returning();

    res.status(201).json({
      ...match,
      homeTeamFlag: match.homeTeamFlag ?? undefined,
      awayTeamFlag: match.awayTeamFlag ?? undefined,
      groupName: match.groupName ?? undefined,
      venue: match.venue ?? undefined,
      homeScore: match.homeScore ?? undefined,
      awayScore: match.awayScore ?? undefined,
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

  const { homeScore, awayScore, status } = parsed.data;

  try {
    const [match] = await db
      .select()
      .from(matchesTable)
      .where(eq(matchesTable.id, matchId));

    if (!match) {
      res.status(404).json({ error: "Not found", message: "Match not found" });
      return;
    }

    const [updatedMatch] = await db
      .update(matchesTable)
      .set({ homeScore, awayScore, status })
      .where(eq(matchesTable.id, matchId))
      .returning();

    if (status === "finished") {
      const bets = await db
        .select()
        .from(betsTable)
        .where(eq(betsTable.matchId, matchId));

      for (const bet of bets) {
        const scored = calculateBetPoints(bet.homeScore, bet.awayScore, homeScore, awayScore);
        await db
          .update(betsTable)
          .set({
            points: scored.points,
            exactScore: scored.exactScore,
            correctOutcome: scored.correctOutcome,
            correctGoalDiff: scored.correctGoalDiff,
            updatedAt: new Date(),
          })
          .where(eq(betsTable.id, bet.id));
      }
    }

    res.json({
      ...updatedMatch,
      homeTeamFlag: updatedMatch.homeTeamFlag ?? undefined,
      awayTeamFlag: updatedMatch.awayTeamFlag ?? undefined,
      groupName: updatedMatch.groupName ?? undefined,
      venue: updatedMatch.venue ?? undefined,
      homeScore: updatedMatch.homeScore ?? undefined,
      awayScore: updatedMatch.awayScore ?? undefined,
      bettingDeadline: new Date(updatedMatch.matchDate.getTime() - 30 * 60 * 1000),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update match result");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        role: usersTable.role,
      })
      .from(usersTable);

    const allBets = await db.select({ userId: betsTable.userId, points: betsTable.points }).from(betsTable);

    const result = users.map((u) => {
      const userBets = allBets.filter((b) => b.userId === u.id);
      return {
        ...u,
        totalPoints: userBets.reduce((sum, b) => sum + b.points, 0),
        betsSubmitted: userBets.length,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list users");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
