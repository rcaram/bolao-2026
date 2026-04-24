import express from "express";
import request from "supertest";

jest.mock("../lib/auth", () => ({
  requireAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const matchesTable = {
  __name: "matches",
  id: { table: "matches", column: "id" },
  stage: { table: "matches", column: "stage" },
  matchNumber: { table: "matches", column: "matchNumber" },
};
const betsTable = {
  __name: "bets",
  id: { table: "bets", column: "id" },
  matchId: { table: "bets", column: "matchId" },
};
const scoringConfigTable = {
  __name: "scoring_config",
  id: { table: "scoring_config", column: "id" },
};

const state = {
  matches: [
    {
      id: 74,
      homeTeamId: 101,
      awayTeamId: 202,
      homePlaceholder: null,
      awayPlaceholder: null,
      groupId: null,
      matchDate: new Date("2026-06-29T19:00:00.000Z"),
      stage: "round_of_32",
      matchNumber: 74,
      venue: "Boston",
      homeScore: null,
      awayScore: null,
      status: "upcoming",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      id: 89,
      homeTeamId: null,
      awayTeamId: 303,
      homePlaceholder: "Winner Match 74",
      awayPlaceholder: null,
      groupId: null,
      matchDate: new Date("2026-07-04T18:00:00.000Z"),
      stage: "round_of_16",
      matchNumber: 89,
      venue: "Philadelphia",
      homeScore: null,
      awayScore: null,
      status: "upcoming",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ],
  bets: [] as Array<{
    id: number;
    matchId: number;
    homeScore: number;
    awayScore: number;
    points: number;
    exactScore: boolean;
    correctOutcome: boolean;
    correctGoalDiff: boolean;
    updatedAt: Date;
  }>,
  scoringConfig: [] as Array<{
    id: number;
    exactScore: number;
    correctOutcomeGoalDiff: number;
    correctOutcome: number;
    wrongOutcome: number;
    bonusChampion: number;
    bonusTopScorer: number;
  }>,
};

type EqCondition = { column: { table: string; column: string }; value: unknown };

function applyWhere<T extends Record<string, unknown>>(rows: T[], condition: EqCondition | undefined): T[] {
  if (!condition) return rows;
  const columnName = condition.column.column;
  return rows.filter((row) => row[columnName] === condition.value);
}

function getRowsForTable(table: { __name: string }): Array<Record<string, unknown>> {
  if (table.__name === "matches") return state.matches;
  if (table.__name === "bets") return state.bets;
  if (table.__name === "scoring_config") return state.scoringConfig;
  return [];
}

const db = {
  select: jest.fn(() => ({
    from: (table: { __name: string }) => {
      const rows = getRowsForTable(table);
      const query = {
        where: async (condition: EqCondition) => applyWhere(rows, condition),
        then: (
          onFulfilled: (value: Array<Record<string, unknown>>) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) => Promise.resolve(rows).then(onFulfilled, onRejected),
      };
      return {
        ...query,
      };
    },
  })),
  update: jest.fn((table: { __name: string }) => {
    let pendingValues: Record<string, unknown> = {};
    return {
      set: (values: Record<string, unknown>) => {
        pendingValues = values;
        return {
          where: (condition: EqCondition) => {
            const rows = getRowsForTable(table);
            const selected = applyWhere(rows, condition);
            const updated = selected.map((row) => {
              Object.assign(row, pendingValues);
              return row;
            });
            return {
              returning: async () => updated,
            };
          },
        };
      },
    };
  }),
  insert: jest.fn(() => ({
    values: () => ({
      returning: async () => [],
    }),
  })),
};

jest.mock("drizzle-orm", () => ({
  eq: (column: { table: string; column: string }, value: unknown) => ({ column, value }),
}));

jest.mock("@workspace/db", () => ({
  db,
  importSchedule: jest.fn(),
  usersTable: { __name: "users" },
  groupsTable: { __name: "groups" },
  teamsTable: { __name: "teams" },
  invitesTable: { __name: "invites" },
  matchesTable,
  betsTable,
  scoringConfigTable,
}));

import adminRouter from "./admin";

describe("admin knockout thin route test", () => {
  it("resolves next knockout placeholder after finishing source match", async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { log: { info: () => void; error: () => void } }).log = {
        info: () => {},
        error: () => {},
      };
      next();
    });
    app.use("/admin", adminRouter);

    const response = await request(app).put("/admin/matches/74/result").send({
      homeScore: 2,
      awayScore: 1,
      status: "finished",
    });

    expect(response.status).toBe(200);
    const roundOf16 = state.matches.find((match) => match.matchNumber === 89);
    expect(roundOf16?.homeTeamId).toBe(101);
  });
});
