import { Router } from "express";
import { db, bonusBetsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { SubmitBonusBetsBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { getBolaoIdFromParams, requireBolaoMember } from "../lib/bolao-auth";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireBolaoMember);

router.get("/", async (req, res) => {
  const userId = req.session.userId!;
  const bolaoId = getBolaoIdFromParams(req);
  if (!bolaoId) {
    res.status(400).json({ error: "Bad request", message: "Invalid bolao ID" });
    return;
  }
  try {
    const [bonus] = await db
      .select()
      .from(bonusBetsTable)
      .where(and(eq(bonusBetsTable.userId, userId), eq(bonusBetsTable.bolaoId, bolaoId)));

    if (!bonus) {
      res.status(404).json({ error: "Not found", message: "No bonus bets found" });
      return;
    }

    res.json(bonus);
  } catch (err) {
    req.log.error({ err }, "Failed to get bonus bets");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const userId = req.session.userId!;
  const bolaoId = getBolaoIdFromParams(req);
  if (!bolaoId) {
    res.status(400).json({ error: "Bad request", message: "Invalid bolao ID" });
    return;
  }
  const parsed = SubmitBonusBetsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: "Invalid request body" });
    return;
  }

  const { champion, topScorer } = parsed.data;

  try {
    const [existing] = await db
      .select()
      .from(bonusBetsTable)
      .where(and(eq(bonusBetsTable.userId, userId), eq(bonusBetsTable.bolaoId, bolaoId)));

    if (existing?.locked) {
      res.status(400).json({ error: "Bad request", message: "Bonus bets are locked and cannot be changed" });
      return;
    }

    let bonus;
    if (existing) {
      [bonus] = await db
        .update(bonusBetsTable)
        .set({ champion, topScorer: topScorer ?? null, updatedAt: new Date() })
        .where(and(eq(bonusBetsTable.userId, userId), eq(bonusBetsTable.bolaoId, bolaoId)))
        .returning();
    } else {
      [bonus] = await db
        .insert(bonusBetsTable)
        .values({ userId, bolaoId, champion, topScorer: topScorer ?? null })
        .returning();
    }

    res.json(bonus);
  } catch (err) {
    req.log.error({ err }, "Failed to submit bonus bets");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
