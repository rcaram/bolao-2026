import {
  resolveKnockoutPlaceholder,
  resolveMatchLoser,
  resolveMatchWinner,
  resolveTeamFromPlaceholder,
  type MatchData,
} from "./results";
import type { TeamStanding } from "./standings";

function createStanding(teamId: number, points: number, goalDifference: number, goalsFor: number): TeamStanding {
  return {
    team: { id: teamId },
    played: 3,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor,
    goalsAgainst: goalsFor - goalDifference,
    goalDifference,
    points,
    position: 1,
    qualified: "direct",
  };
}

describe("results helpers", () => {
  it("resolves winner/runner-up placeholders from standings", () => {
    const standingsByGroupName: Record<string, TeamStanding[]> = {
      A: [createStanding(11, 7, 3, 5), createStanding(12, 4, 1, 4)],
    };
    const completedGroupIds = new Set<number>([1]);
    const groupByName = { A: { id: 1, name: "A" } };

    expect(
      resolveTeamFromPlaceholder("Winner Group A", standingsByGroupName, completedGroupIds, groupByName),
    ).toBe(11);
    expect(
      resolveTeamFromPlaceholder("Runner-up Group A", standingsByGroupName, completedGroupIds, groupByName),
    ).toBe(12);
  });

  it("resolves Best 3rd only when all referenced groups complete", () => {
    const standingsByGroupName: Record<string, TeamStanding[]> = {
      A: [createStanding(11, 7, 3, 5), createStanding(12, 4, 1, 4), createStanding(13, 4, 2, 6)],
      B: [createStanding(21, 7, 3, 5), createStanding(22, 4, 1, 4), createStanding(23, 5, 1, 4)],
    };
    const groupByName = { A: { id: 1, name: "A" }, B: { id: 2, name: "B" } };

    expect(
      resolveTeamFromPlaceholder("Best 3rd (A/B)", standingsByGroupName, new Set<number>([1]), groupByName),
    ).toBeNull();
    expect(
      resolveTeamFromPlaceholder("Best 3rd (A/B)", standingsByGroupName, new Set<number>([1, 2]), groupByName),
    ).toBe(23);
  });

  it("resolves knockout winner and loser from finished match", () => {
    const matches: MatchData[] = [
      {
        matchNumber: 74,
        homeTeamId: 101,
        awayTeamId: 202,
        homeScore: 2,
        awayScore: 1,
        status: "finished",
      },
    ];

    expect(resolveMatchWinner(74, matches)).toBe(101);
    expect(resolveMatchLoser(74, matches)).toBe(202);
  });

  it("returns null for unfinished or tied knockout source match", () => {
    const matches: MatchData[] = [
      {
        matchNumber: 75,
        homeTeamId: 101,
        awayTeamId: 202,
        homeScore: 1,
        awayScore: 1,
        status: "finished",
      },
      {
        matchNumber: 76,
        homeTeamId: 303,
        awayTeamId: 404,
        homeScore: 2,
        awayScore: 0,
        status: "upcoming",
      },
    ];

    expect(resolveMatchWinner(75, matches)).toBeNull();
    expect(resolveMatchLoser(75, matches)).toBeNull();
    expect(resolveMatchWinner(76, matches)).toBeNull();
  });

  it("parses Winner Match and Loser Match placeholders", () => {
    const matches: MatchData[] = [
      {
        matchNumber: 101,
        homeTeamId: 901,
        awayTeamId: 902,
        homeScore: 1,
        awayScore: 0,
        status: "finished",
      },
    ];

    expect(resolveKnockoutPlaceholder("Winner Match 101", matches)).toBe(901);
    expect(resolveKnockoutPlaceholder("Loser Match 101", matches)).toBe(902);
    expect(resolveKnockoutPlaceholder("Winner Group A", matches)).toBeNull();
  });
});
