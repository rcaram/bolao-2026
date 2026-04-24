import { calculateStandingsPure, type MatchForStandings, type TeamForStandings } from "./standings";

type PureTeam = TeamForStandings;
type PureMatch = MatchForStandings & {
  id: number;
  homePlaceholder: null;
  awayPlaceholder: null;
  groupId: number;
  matchDate: Date;
  stage: "group";
  matchNumber: number;
  venue: string;
  createdAt: Date;
};

function makeTeam(id: number, _groupId: number): PureTeam {
  return { id };
}

function makeGroupMatch(id: number, homeTeamId: number, awayTeamId: number, homeScore: number, awayScore: number): PureMatch {
  return {
    id,
    homeTeamId,
    awayTeamId,
    homePlaceholder: null,
    awayPlaceholder: null,
    groupId: 1,
    matchDate: new Date("2026-06-11T19:00:00.000Z"),
    stage: "group",
    matchNumber: id,
    venue: "Test Venue",
    homeScore,
    awayScore,
    status: "finished",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

describe("calculateStandingsPure", () => {
  it("ranks teams by points, goal difference, then goals for", () => {
    const teams: PureTeam[] = [makeTeam(1, 1), makeTeam(2, 1), makeTeam(3, 1), makeTeam(4, 1)];
    const matches: PureMatch[] = [
      makeGroupMatch(1, 1, 2, 2, 0),
      makeGroupMatch(2, 3, 4, 1, 0),
      makeGroupMatch(3, 1, 3, 1, 1),
      makeGroupMatch(4, 2, 4, 2, 1),
      makeGroupMatch(5, 1, 4, 0, 1),
      makeGroupMatch(6, 2, 3, 3, 1),
    ];

    const standings = calculateStandingsPure(teams, matches);

    expect(standings.map((entry) => entry.team.id)).toEqual([2, 1, 3, 4]);
    expect(standings.map((entry) => entry.points)).toEqual([6, 4, 4, 3]);
    expect(standings[0].goalDifference).toBe(1);
    expect(standings[2].goalDifference).toBe(-1);
    expect(standings.map((entry) => entry.position)).toEqual([1, 2, 3, 4]);
    expect(standings.map((entry) => entry.qualified)).toEqual([
      "direct",
      "direct",
      "potential_third",
      "eliminated",
    ]);
  });

  it("keeps qualification as tbd when group not fully finished", () => {
    const teams: PureTeam[] = [makeTeam(1, 1), makeTeam(2, 1), makeTeam(3, 1), makeTeam(4, 1)];
    const matches: PureMatch[] = [
      makeGroupMatch(1, 1, 2, 2, 0),
      { ...makeGroupMatch(2, 3, 4, 1, 0), status: "upcoming", homeScore: null, awayScore: null },
    ];

    const standings = calculateStandingsPure(teams, matches);
    expect(standings.every((entry) => entry.qualified === "tbd")).toBe(true);
  });
});
