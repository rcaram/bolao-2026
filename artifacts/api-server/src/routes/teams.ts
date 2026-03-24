import { Router } from "express";
import { db, teamsTable, groupsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetTeamsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const queryParsed = GetTeamsQueryParams.safeParse(req.query);
    const { groupId } = queryParsed.success ? queryParsed.data : {};

    const teams = groupId
      ? await db.select().from(teamsTable).where(eq(teamsTable.groupId, groupId))
      : await db.select().from(teamsTable);

    const groups = await db.select().from(groupsTable);
    const groupMap = Object.fromEntries(groups.map((g) => [g.id, g]));

    const result = teams.map((t) => ({
      ...t,
      flag: t.flag ?? undefined,
      groupId: t.groupId ?? undefined,
      group: t.groupId ? groupMap[t.groupId] : undefined,
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get teams");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
