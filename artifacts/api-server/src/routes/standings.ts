import { Router } from "express";
import { db, groupsTable, teamsTable, matchesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { calculateStandingsPure, type TeamStanding as TeamStandingBase } from "../lib/standings";

const router = Router();

export type TeamStanding = TeamStandingBase<typeof teamsTable.$inferSelect>;

export async function calculateGroupStandings(groupId: number): Promise<TeamStanding[]> {
  const teams = await db.select().from(teamsTable).where(eq(teamsTable.groupId, groupId));
  const matches = await db.select().from(matchesTable).where(
    and(eq(matchesTable.groupId, groupId), eq(matchesTable.stage, "group"))
  );
  return calculateStandingsPure(teams, matches);
}

// GET /api/standings — all groups
router.get("/", async (req, res) => {
  try {
    const groups = await db.select().from(groupsTable);
    const result = await Promise.all(
      groups.map(async g => ({
        group: g,
        standings: await calculateGroupStandings(g.id),
      }))
    );
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get standings");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/standings/:groupId
router.get("/:groupId", async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    if (isNaN(groupId)) {
      res.status(400).json({ error: "Bad request", message: "Invalid group ID" });
      return;
    }

    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
    if (!group) {
      res.status(404).json({ error: "Not found", message: "Group not found" });
      return;
    }

    const standings = await calculateGroupStandings(groupId);
    res.json({ group, standings });
  } catch (err) {
    req.log.error({ err }, "Failed to get group standings");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
