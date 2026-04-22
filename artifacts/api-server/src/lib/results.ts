import { TeamStanding } from "../routes/standings";

/**
 * Given a placeholder string, return the resolved teamId or null.
 */
export function resolveTeamFromPlaceholder(
  placeholder: string,
  standingsByGroupName: Record<string, TeamStanding[]>,
  completedGroupIds: Set<number>,
  groupByName: Record<string, { id: number; name: string }>,
): number | null {
  // "Winner Group A" or "Runner-up Group A"
  const winnerMatch = placeholder.match(/^Winner Group ([A-L])$/);
  if (winnerMatch) {
    const groupLetter = winnerMatch[1];
    const standings = standingsByGroupName[groupLetter];
    if (standings && standings.length > 0) {
      return standings[0].team.id; // 1st place
    }
    return null;
  }

  const runnerUpMatch = placeholder.match(/^Runner-up Group ([A-L])$/);
  if (runnerUpMatch) {
    const groupLetter = runnerUpMatch[1];
    const standings = standingsByGroupName[groupLetter];
    if (standings && standings.length > 1) {
      return standings[1].team.id; // 2nd place
    }
    return null;
  }

  // "Best 3rd (A/B/C/D/F)" — only resolve when ALL referenced groups are complete
  const best3rdMatch = placeholder.match(/^Best 3rd \(([A-L/]+)\)$/);
  if (best3rdMatch) {
    const letters = best3rdMatch[1].split("/");
    // Check all referenced groups are completed
    for (const letter of letters) {
      const group = groupByName[letter];
      if (!group || !completedGroupIds.has(group.id)) {
        return null; // Not all groups finished yet
      }
    }

    // Collect 3rd-place teams from these groups, pick the best one
    const thirdPlaceTeams: TeamStanding[] = [];
    for (const letter of letters) {
      const standings = standingsByGroupName[letter];
      if (standings && standings.length > 2) {
        thirdPlaceTeams.push(standings[2]); // 3rd place
      }
    }

    if (thirdPlaceTeams.length === 0) return null;

    // Sort best 3rd: points → goal diff → goals for
    thirdPlaceTeams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    return thirdPlaceTeams[0].team.id;
  }

  return null;
}


