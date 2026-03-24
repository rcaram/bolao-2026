import { integer, pgTable, timestamp } from "drizzle-orm/pg-core";

export const scoringConfigTable = pgTable("scoring_config", {
  id: integer("id").primaryKey().default(1),
  exactScore: integer("exact_score").notNull().default(10),
  correctOutcomeGoalDiff: integer("correct_outcome_goal_diff").notNull().default(7),
  correctOutcome: integer("correct_outcome").notNull().default(5),
  wrongOutcome: integer("wrong_outcome").notNull().default(0),
  bonusChampion: integer("bonus_champion").notNull().default(15),
  bonusTopScorer: integer("bonus_top_scorer").notNull().default(10),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
