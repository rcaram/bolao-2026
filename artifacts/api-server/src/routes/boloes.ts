import { Router } from "express";
import crypto from "node:crypto";
import {
  bolaoMembersTable,
  boloesTable,
  bolaoScoringConfigsTable,
  db,
  usersTable,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { getBolaoIdFromParams, requireBolaoAdmin, requireBolaoMember } from "../lib/bolao-auth";
import { requireAuth } from "../lib/auth";
import { DEFAULT_SCORING_CONFIG, type ScoringConfig } from "../lib/scoring";
import betsRouter from "./bets";
import rankingsRouter from "./rankings";
import bonusesRouter from "./bonuses";

const router = Router();

router.use("/:bolaoId/bets", betsRouter);
router.use("/:bolaoId/rankings", rankingsRouter);
router.use("/:bolaoId/bonuses", bonusesRouter);

function generateInviteCode(): string {
  return crypto.randomBytes(6).toString("hex");
}

function parseCreateBolaoBody(body: unknown): { name: string; description?: string } | null {
  if (typeof body !== "object" || body === null) return null;
  const payload = body as Record<string, unknown>;
  if (typeof payload.name !== "string" || payload.name.trim().length < 3) return null;
  const description = typeof payload.description === "string" && payload.description.trim().length > 0
    ? payload.description.trim()
    : undefined;
  return { name: payload.name.trim(), description };
}

function parseJoinBody(body: unknown): { inviteCode: string } | null {
  if (typeof body !== "object" || body === null) return null;
  const payload = body as Record<string, unknown>;
  if (typeof payload.inviteCode !== "string" || payload.inviteCode.trim().length === 0) return null;
  return { inviteCode: payload.inviteCode.trim() };
}

function parseScoringConfigBody(body: unknown): ScoringConfig | null {
  if (typeof body !== "object" || body === null) return null;
  const payload = body as Record<string, unknown>;
  const fields: (keyof ScoringConfig)[] = [
    "exactScore",
    "correctOutcomeGoalDiff",
    "correctOutcome",
    "wrongOutcome",
    "bonusChampion",
    "bonusTopScorer",
  ];
  const parsed: Partial<ScoringConfig> = {};
  for (const field of fields) {
    const value = Number(payload[field]);
    if (!Number.isInteger(value) || value < 0) return null;
    parsed[field] = value;
  }
  return parsed as ScoringConfig;
}

router.get("/", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  try {
    if (req.session.userRole === "admin") {
      const boloes = await db.select().from(boloesTable);
      res.json(boloes);
      return;
    }
    const rows = await db
      .select({
        id: boloesTable.id,
        name: boloesTable.name,
        description: boloesTable.description,
        inviteCode: boloesTable.inviteCode,
        createdBy: boloesTable.createdBy,
        createdAt: boloesTable.createdAt,
      })
      .from(bolaoMembersTable)
      .innerJoin(boloesTable, eq(bolaoMembersTable.bolaoId, boloesTable.id))
      .where(eq(bolaoMembersTable.userId, userId));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list boloes");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const body = parseCreateBolaoBody(req.body);
  if (!body) {
    res.status(400).json({ error: "Bad request", message: "Invalid body" });
    return;
  }

  const userId = req.session.userId!;
  try {
    const [bolao] = await db
      .insert(boloesTable)
      .values({
        name: body.name,
        description: body.description ?? null,
        inviteCode: generateInviteCode(),
        createdBy: userId,
      })
      .returning();

    await db.insert(bolaoMembersTable).values({ bolaoId: bolao.id, userId, role: "admin" });
    await db.insert(bolaoScoringConfigsTable).values({ bolaoId: bolao.id, ...DEFAULT_SCORING_CONFIG });
    res.status(201).json(bolao);
  } catch (err) {
    req.log.error({ err }, "Failed to create bolao");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/join", requireAuth, async (req, res) => {
  const body = parseJoinBody(req.body);
  if (!body) {
    res.status(400).json({ error: "Bad request", message: "Invalid body" });
    return;
  }
  const userId = req.session.userId!;
  try {
    const [bolao] = await db.select().from(boloesTable).where(eq(boloesTable.inviteCode, body.inviteCode));
    if (!bolao) {
      res.status(404).json({ error: "Not found", message: "Invalid invite code" });
      return;
    }

    const [existing] = await db
      .select({ id: bolaoMembersTable.id })
      .from(bolaoMembersTable)
      .where(and(eq(bolaoMembersTable.bolaoId, bolao.id), eq(bolaoMembersTable.userId, userId)));

    if (!existing) {
      await db.insert(bolaoMembersTable).values({ bolaoId: bolao.id, userId, role: "member" });
    }

    res.json(bolao);
  } catch (err) {
    req.log.error({ err }, "Failed to join bolao");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:bolaoId", requireAuth, requireBolaoMember, async (req, res) => {
  const bolaoId = getBolaoIdFromParams(req);
  if (!bolaoId) {
    res.status(400).json({ error: "Bad request", message: "Invalid bolao ID" });
    return;
  }
  try {
    const [bolao] = await db.select().from(boloesTable).where(eq(boloesTable.id, bolaoId));
    if (!bolao) {
      res.status(404).json({ error: "Not found", message: "Bolao not found" });
      return;
    }
    res.json(bolao);
  } catch (err) {
    req.log.error({ err }, "Failed to get bolao");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:bolaoId", requireAuth, requireBolaoAdmin, async (req, res) => {
  const bolaoId = getBolaoIdFromParams(req);
  const body = parseCreateBolaoBody(req.body);
  if (!bolaoId || !body) {
    res.status(400).json({ error: "Bad request", message: "Invalid request" });
    return;
  }
  try {
    const [updated] = await db
      .update(boloesTable)
      .set({ name: body.name, description: body.description ?? null })
      .where(eq(boloesTable.id, bolaoId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found", message: "Bolao not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update bolao");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:bolaoId", requireAuth, requireBolaoAdmin, async (req, res) => {
  const bolaoId = getBolaoIdFromParams(req);
  if (!bolaoId) {
    res.status(400).json({ error: "Bad request", message: "Invalid bolao ID" });
    return;
  }
  try {
    const [deleted] = await db.delete(boloesTable).where(eq(boloesTable.id, bolaoId)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Not found", message: "Bolao not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete bolao");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:bolaoId/leave", requireAuth, requireBolaoMember, async (req, res) => {
  const bolaoId = getBolaoIdFromParams(req);
  const userId = req.session.userId!;
  if (!bolaoId) {
    res.status(400).json({ error: "Bad request", message: "Invalid bolao ID" });
    return;
  }
  try {
    await db
      .delete(bolaoMembersTable)
      .where(and(eq(bolaoMembersTable.bolaoId, bolaoId), eq(bolaoMembersTable.userId, userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to leave bolao");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:bolaoId/members", requireAuth, requireBolaoMember, async (req, res) => {
  const bolaoId = getBolaoIdFromParams(req);
  if (!bolaoId) {
    res.status(400).json({ error: "Bad request", message: "Invalid bolao ID" });
    return;
  }
  try {
    const members = await db
      .select({
        userId: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: bolaoMembersTable.role,
        joinedAt: bolaoMembersTable.joinedAt,
      })
      .from(bolaoMembersTable)
      .innerJoin(usersTable, eq(bolaoMembersTable.userId, usersTable.id))
      .where(eq(bolaoMembersTable.bolaoId, bolaoId));
    res.json(members);
  } catch (err) {
    req.log.error({ err }, "Failed to list bolao members");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:bolaoId/members/:userId", requireAuth, requireBolaoAdmin, async (req, res) => {
  const bolaoId = getBolaoIdFromParams(req);
  const userId = Number.parseInt(req.params.userId as string, 10);
  if (!bolaoId || Number.isNaN(userId)) {
    res.status(400).json({ error: "Bad request", message: "Invalid user or bolao ID" });
    return;
  }
  try {
    await db
      .delete(bolaoMembersTable)
      .where(and(eq(bolaoMembersTable.bolaoId, bolaoId), eq(bolaoMembersTable.userId, userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to remove member");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:bolaoId/members/:userId/role", requireAuth, requireBolaoAdmin, async (req, res) => {
  const bolaoId = getBolaoIdFromParams(req);
  const userId = Number.parseInt(req.params.userId as string, 10);
  const role = (req.body as { role?: string }).role;
  if (!bolaoId || Number.isNaN(userId) || (role !== "admin" && role !== "member")) {
    res.status(400).json({ error: "Bad request", message: "Invalid role or ID" });
    return;
  }
  try {
    const [updated] = await db
      .update(bolaoMembersTable)
      .set({ role })
      .where(and(eq(bolaoMembersTable.bolaoId, bolaoId), eq(bolaoMembersTable.userId, userId)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found", message: "Member not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update member role");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:bolaoId/invite-code/regenerate", requireAuth, requireBolaoAdmin, async (req, res) => {
  const bolaoId = getBolaoIdFromParams(req);
  if (!bolaoId) {
    res.status(400).json({ error: "Bad request", message: "Invalid bolao ID" });
    return;
  }
  try {
    const [updated] = await db
      .update(boloesTable)
      .set({ inviteCode: generateInviteCode() })
      .where(eq(boloesTable.id, bolaoId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found", message: "Bolao not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to regenerate invite code");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:bolaoId/scoring-config", requireAuth, requireBolaoMember, async (req, res) => {
  const bolaoId = getBolaoIdFromParams(req);
  if (!bolaoId) {
    res.status(400).json({ error: "Bad request", message: "Invalid bolao ID" });
    return;
  }
  try {
    const [config] = await db
      .select()
      .from(bolaoScoringConfigsTable)
      .where(eq(bolaoScoringConfigsTable.bolaoId, bolaoId));
    if (!config) {
      res.json(DEFAULT_SCORING_CONFIG);
      return;
    }
    res.json(config);
  } catch (err) {
    req.log.error({ err }, "Failed to get scoring config");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:bolaoId/scoring-config", requireAuth, requireBolaoAdmin, async (req, res) => {
  const bolaoId = getBolaoIdFromParams(req);
  const data = parseScoringConfigBody(req.body);
  if (!bolaoId || !data) {
    res.status(400).json({ error: "Bad request", message: "Invalid scoring config" });
    return;
  }
  try {
    const [existing] = await db
      .select({ id: bolaoScoringConfigsTable.id })
      .from(bolaoScoringConfigsTable)
      .where(eq(bolaoScoringConfigsTable.bolaoId, bolaoId));
    if (existing) {
      await db
        .update(bolaoScoringConfigsTable)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(bolaoScoringConfigsTable.bolaoId, bolaoId));
    } else {
      await db.insert(bolaoScoringConfigsTable).values({ bolaoId, ...data });
    }
    const [config] = await db
      .select()
      .from(bolaoScoringConfigsTable)
      .where(eq(bolaoScoringConfigsTable.bolaoId, bolaoId));
    res.json(config);
  } catch (err) {
    req.log.error({ err }, "Failed to update scoring config");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:bolaoId/stats", requireAuth, requireBolaoMember, async (req, res) => {
  const bolaoId = getBolaoIdFromParams(req);
  if (!bolaoId) {
    res.status(400).json({ error: "Bad request", message: "Invalid bolao ID" });
    return;
  }
  try {
    const [totals] = await db
      .select({
        members: sql<number>`count(*)::int`,
      })
      .from(bolaoMembersTable)
      .where(eq(bolaoMembersTable.bolaoId, bolaoId));
    res.json({ members: totals?.members ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to get bolao stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
