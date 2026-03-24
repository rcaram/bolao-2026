import { Router } from "express";
import { db, bonusBetsTable, matchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SubmitBonusBetsBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  try {
    const [bonus] = await db
      .select()
      .from(bonusBetsTable)
      .where(eq(bonusBetsTable.userId, userId));

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

router.post("/", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
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
      .where(eq(bonusBetsTable.userId, userId));

    if (existing?.locked) {
      res.status(400).json({ error: "Bad request", message: "Bonus bets are locked and cannot be changed" });
      return;
    }

    let bonus;
    if (existing) {
      [bonus] = await db
        .update(bonusBetsTable)
        .set({ champion, topScorer: topScorer ?? null, updatedAt: new Date() })
        .where(eq(bonusBetsTable.userId, userId))
        .returning();
    } else {
      [bonus] = await db
        .insert(bonusBetsTable)
        .values({ userId, champion, topScorer: topScorer ?? null })
        .returning();
    }

    res.json(bonus);
  } catch (err) {
    req.log.error({ err }, "Failed to submit bonus bets");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
