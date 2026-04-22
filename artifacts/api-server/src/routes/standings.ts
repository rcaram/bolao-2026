import { Router } from "express";
import { db, groupsTable, teamsTable, matchesTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";

const router = Router();

export interface TeamStanding {
  team: typeof teamsTable.$inferSelect;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
  qualified: "direct" | "potential_third" | "eliminated" | "tbd";
}

export async function calculateGroupStandings(groupId: number): Promise<TeamStanding[]> {
  const teams = await db.select().from(teamsTable).where(eq(teamsTable.groupId, groupId));
  const matches = await db.select().from(matchesTable).where(
    and(eq(matchesTable.groupId, groupId), eq(matchesTable.stage, "group"))
  );

  const stats: Record<number, { w: number; d: number; l: number; gf: number; ga: number; played: number }> = {};
  for (const t of teams) {
    stats[t.id] = { w: 0, d: 0, l: 0, gf: 0, ga: 0, played: 0 };
  }

  for (const m of matches) {
    if (m.status !== "finished" || m.homeScore === null || m.awayScore === null) continue;
    if (!m.homeTeamId || !m.awayTeamId) continue;

    const hs = stats[m.homeTeamId];
    const as = stats[m.awayTeamId];
    if (!hs || !as) continue;

    hs.played++; as.played++;
    hs.gf += m.homeScore; hs.ga += m.awayScore;
    as.gf += m.awayScore; as.ga += m.homeScore;

    if (m.homeScore > m.awayScore) { hs.w++; as.l++; }
    else if (m.homeScore < m.awayScore) { as.w++; hs.l++; }
    else { hs.d++; as.d++; }
  }

  const standings: TeamStanding[] = teams.map(team => {
    const s = stats[team.id] ?? { w: 0, d: 0, l: 0, gf: 0, ga: 0, played: 0 };
    const points = s.w * 3 + s.d;
    return {
      team,
      played: s.played,
      won: s.w,
      drawn: s.d,
      lost: s.l,
      goalsFor: s.gf,
      goalsAgainst: s.ga,
      goalDifference: s.gf - s.ga,
      points,
      position: 0,
      qualified: "tbd",
    };
  });

  // Sort: points → goal diff → goals for
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  // Assign positions and qualification status
  const allMatchesPlayed = matches.length > 0 && matches.every(m => m.status === "finished");
  standings.forEach((s, i) => {
    s.position = i + 1;
    if (allMatchesPlayed) {
      if (i < 2) s.qualified = "direct";
      else if (i === 2) s.qualified = "potential_third";
      else s.qualified = "eliminated";
    } else {
      s.qualified = "tbd";
    }
  });

  return standings;
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
