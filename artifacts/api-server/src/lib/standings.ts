export interface TeamForStandings {
  id: number;
}

export interface MatchForStandings {
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

export interface TeamStanding<TTeam extends TeamForStandings = TeamForStandings> {
  team: TTeam;
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

export function calculateStandingsPure<TTeam extends TeamForStandings, TMatch extends MatchForStandings>(
  teams: TTeam[],
  matches: TMatch[],
): TeamStanding<TTeam>[] {
  const stats: Record<number, { w: number; d: number; l: number; gf: number; ga: number; played: number }> = {};
  for (const team of teams) {
    stats[team.id] = { w: 0, d: 0, l: 0, gf: 0, ga: 0, played: 0 };
  }

  for (const match of matches) {
    if (match.status !== "finished" || match.homeScore === null || match.awayScore === null) continue;
    if (!match.homeTeamId || !match.awayTeamId) continue;

    const homeStats = stats[match.homeTeamId];
    const awayStats = stats[match.awayTeamId];
    if (!homeStats || !awayStats) continue;

    homeStats.played++; awayStats.played++;
    homeStats.gf += match.homeScore; homeStats.ga += match.awayScore;
    awayStats.gf += match.awayScore; awayStats.ga += match.homeScore;

    if (match.homeScore > match.awayScore) {
      homeStats.w++;
      awayStats.l++;
    } else if (match.homeScore < match.awayScore) {
      awayStats.w++;
      homeStats.l++;
    } else {
      homeStats.d++;
      awayStats.d++;
    }
  }

  const standings: TeamStanding<TTeam>[] = teams.map((team) => {
    const teamStats = stats[team.id] ?? { w: 0, d: 0, l: 0, gf: 0, ga: 0, played: 0 };
    const points = teamStats.w * 3 + teamStats.d;
    return {
      team,
      played: teamStats.played,
      won: teamStats.w,
      drawn: teamStats.d,
      lost: teamStats.l,
      goalsFor: teamStats.gf,
      goalsAgainst: teamStats.ga,
      goalDifference: teamStats.gf - teamStats.ga,
      points,
      position: 0,
      qualified: "tbd",
    };
  });

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  const allMatchesPlayed = matches.length > 0 && matches.every((match) => match.status === "finished");
  standings.forEach((standing, index) => {
    standing.position = index + 1;
    if (allMatchesPlayed) {
      if (index < 2) standing.qualified = "direct";
      else if (index === 2) standing.qualified = "potential_third";
      else standing.qualified = "eliminated";
    } else {
      standing.qualified = "tbd";
    }
  });

  return standings;
}
