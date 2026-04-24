import { resolveKnockoutPlaceholder, resolveTeamFromPlaceholder, type MatchData } from "./results";
import { calculateStandingsPure, type MatchForStandings, type TeamForStandings, type TeamStanding } from "./standings";

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

interface BracketMatch extends MatchData {
  id: number;
  stage: "group" | "round_of_32" | "round_of_16" | "quarterfinal" | "semifinal" | "third_place" | "final";
  groupId: number | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
}

function makeTeam(id: number, _groupId: number): PureTeam {
  return { id };
}

function makeGroupMatch(id: number, groupId: number, homeTeamId: number, awayTeamId: number, homeScore: number, awayScore: number): PureMatch {
  return {
    id,
    homeTeamId,
    awayTeamId,
    homePlaceholder: null,
    awayPlaceholder: null,
    groupId,
    matchDate: new Date("2026-06-11T19:00:00.000Z"),
    stage: "group",
    matchNumber: id,
    venue: "Group Venue",
    homeScore,
    awayScore,
    status: "finished",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function toMatchData(matches: BracketMatch[]): MatchData[] {
  return matches.map((match) => ({
    matchNumber: match.matchNumber,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
  }));
}

describe("pure bracket progression", () => {
  it("moves teams from group to final via placeholders", () => {
    const teamsByGroup: Record<string, PureTeam[]> = {
      A: [makeTeam(1, 1), makeTeam(2, 1), makeTeam(3, 1), makeTeam(4, 1)],
      B: [makeTeam(5, 2), makeTeam(6, 2), makeTeam(7, 2), makeTeam(8, 2)],
    };

    const groupMatchesA: PureMatch[] = [
      makeGroupMatch(1, 1, 1, 2, 2, 0),
      makeGroupMatch(2, 1, 3, 4, 1, 1),
      makeGroupMatch(3, 1, 1, 3, 1, 0),
      makeGroupMatch(4, 1, 2, 4, 2, 0),
      makeGroupMatch(5, 1, 1, 4, 3, 1),
      makeGroupMatch(6, 1, 2, 3, 1, 0),
    ];
    const groupMatchesB: PureMatch[] = [
      makeGroupMatch(7, 2, 5, 6, 2, 1),
      makeGroupMatch(8, 2, 7, 8, 2, 0),
      makeGroupMatch(9, 2, 5, 7, 1, 0),
      makeGroupMatch(10, 2, 6, 8, 2, 1),
      makeGroupMatch(11, 2, 5, 8, 2, 0),
      makeGroupMatch(12, 2, 6, 7, 1, 0),
    ];

    const standingsByGroupName: Record<string, TeamStanding[]> = {
      A: calculateStandingsPure(teamsByGroup.A, groupMatchesA),
      B: calculateStandingsPure(teamsByGroup.B, groupMatchesB),
    };
    const completedGroupIds = new Set<number>([1, 2]);
    const groupByName = { A: { id: 1, name: "A" }, B: { id: 2, name: "B" } };

    const bracket: BracketMatch[] = [
      {
        id: 73,
        matchNumber: 73,
        stage: "round_of_32",
        groupId: null,
        homePlaceholder: "Winner Group A",
        awayPlaceholder: "Runner-up Group B",
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        status: "upcoming",
      },
      {
        id: 74,
        matchNumber: 74,
        stage: "round_of_32",
        groupId: null,
        homePlaceholder: "Winner Group B",
        awayPlaceholder: "Runner-up Group A",
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        status: "upcoming",
      },
      {
        id: 89,
        matchNumber: 89,
        stage: "round_of_16",
        groupId: null,
        homePlaceholder: "Winner Match 73",
        awayPlaceholder: "Winner Match 74",
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        status: "upcoming",
      },
      {
        id: 97,
        matchNumber: 97,
        stage: "quarterfinal",
        groupId: null,
        homePlaceholder: "Winner Match 89",
        awayPlaceholder: "Winner Match 90",
        homeTeamId: null,
        awayTeamId: 99,
        homeScore: null,
        awayScore: null,
        status: "upcoming",
      },
      {
        id: 101,
        matchNumber: 101,
        stage: "semifinal",
        groupId: null,
        homePlaceholder: "Winner Match 97",
        awayPlaceholder: "Winner Match 98",
        homeTeamId: null,
        awayTeamId: 88,
        homeScore: null,
        awayScore: null,
        status: "upcoming",
      },
      {
        id: 103,
        matchNumber: 103,
        stage: "third_place",
        groupId: null,
        homePlaceholder: "Loser Match 101",
        awayPlaceholder: "Loser Match 102",
        homeTeamId: null,
        awayTeamId: 77,
        homeScore: null,
        awayScore: null,
        status: "upcoming",
      },
      {
        id: 104,
        matchNumber: 104,
        stage: "final",
        groupId: null,
        homePlaceholder: "Winner Match 101",
        awayPlaceholder: "Winner Match 102",
        homeTeamId: null,
        awayTeamId: 66,
        homeScore: null,
        awayScore: null,
        status: "upcoming",
      },
    ];

    for (const match of bracket.filter((entry) => entry.stage === "round_of_32")) {
      if (match.homePlaceholder) {
        match.homeTeamId = resolveTeamFromPlaceholder(
          match.homePlaceholder,
          standingsByGroupName,
          completedGroupIds,
          groupByName,
        );
      }
      if (match.awayPlaceholder) {
        match.awayTeamId = resolveTeamFromPlaceholder(
          match.awayPlaceholder,
          standingsByGroupName,
          completedGroupIds,
          groupByName,
        );
      }
      match.homeScore = 2;
      match.awayScore = 1;
      match.status = "finished";
    }

    const r16 = bracket.find((entry) => entry.matchNumber === 89);
    expect(r16).toBeDefined();
    if (!r16) return;

    r16.homeTeamId = resolveKnockoutPlaceholder(r16.homePlaceholder ?? "", toMatchData(bracket));
    r16.awayTeamId = resolveKnockoutPlaceholder(r16.awayPlaceholder ?? "", toMatchData(bracket));
    r16.homeScore = 1;
    r16.awayScore = 0;
    r16.status = "finished";

    const qf = bracket.find((entry) => entry.matchNumber === 97);
    expect(qf).toBeDefined();
    if (!qf) return;
    qf.homeTeamId = resolveKnockoutPlaceholder(qf.homePlaceholder ?? "", toMatchData(bracket));
    qf.homeScore = 3;
    qf.awayScore = 0;
    qf.status = "finished";

    const sf = bracket.find((entry) => entry.matchNumber === 101);
    expect(sf).toBeDefined();
    if (!sf) return;
    sf.homeTeamId = resolveKnockoutPlaceholder(sf.homePlaceholder ?? "", toMatchData(bracket));
    sf.homeScore = 2;
    sf.awayScore = 1;
    sf.status = "finished";

    const thirdPlace = bracket.find((entry) => entry.matchNumber === 103);
    const final = bracket.find((entry) => entry.matchNumber === 104);
    expect(thirdPlace).toBeDefined();
    expect(final).toBeDefined();
    if (!thirdPlace || !final) return;

    thirdPlace.homeTeamId = resolveKnockoutPlaceholder(thirdPlace.homePlaceholder ?? "", toMatchData(bracket));
    final.homeTeamId = resolveKnockoutPlaceholder(final.homePlaceholder ?? "", toMatchData(bracket));

    expect(bracket.find((entry) => entry.matchNumber === 73)?.homeTeamId).toBe(1);
    expect(bracket.find((entry) => entry.matchNumber === 73)?.awayTeamId).toBe(6);
    expect(bracket.find((entry) => entry.matchNumber === 74)?.homeTeamId).toBe(5);
    expect(bracket.find((entry) => entry.matchNumber === 74)?.awayTeamId).toBe(2);
    expect(r16.homeTeamId).toBe(1);
    expect(r16.awayTeamId).toBe(5);
    expect(qf.homeTeamId).toBe(1);
    expect(sf.homeTeamId).toBe(1);
    expect(thirdPlace.homeTeamId).toBe(88);
    expect(final.homeTeamId).toBe(1);
  });
});
