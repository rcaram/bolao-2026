import { pgTable, serial, integer, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { matchesTable } from "./matches";
import { boloesTable } from "./boloes";

export const betsTable = pgTable(
  "bets",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    bolaoId: integer("bolao_id")
      .notNull()
      .references(() => boloesTable.id, { onDelete: "cascade" }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matchesTable.id, { onDelete: "cascade" }),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
    points: integer("points").notNull().default(0),
    exactScore: boolean("exact_score").notNull().default(false),
    correctOutcome: boolean("correct_outcome").notNull().default(false),
    correctGoalDiff: boolean("correct_goal_diff").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userMatchBolaoUniqueIdx: uniqueIndex("bets_user_id_match_id_bolao_id_uidx").on(
      table.userId,
      table.matchId,
      table.bolaoId
    ),
  })
);

export const insertBetSchema = createInsertSchema(betsTable).omit({
  id: true,
  points: true,
  exactScore: true,
  correctOutcome: true,
  correctGoalDiff: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBet = z.infer<typeof insertBetSchema>;
export type Bet = typeof betsTable.$inferSelect;
