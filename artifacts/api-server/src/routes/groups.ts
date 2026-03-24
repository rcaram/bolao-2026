import { Router } from "express";
import { db, groupsTable, teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const groups = await db.select().from(groupsTable);
    const teams = await db.select().from(teamsTable);

    const result = groups.map((g) => ({
      ...g,
      description: g.description ?? undefined,
      teams: teams
        .filter((t) => t.groupId === g.id)
        .map((t) => ({
          ...t,
          flag: t.flag ?? undefined,
          groupId: t.groupId ?? undefined,
        })),
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get groups");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
