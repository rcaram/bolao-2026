import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const bonusBetsTable = pgTable("bonus_bets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" })
    .unique(),
  champion: text("champion").notNull(),
  topScorer: text("top_scorer"),
  championPoints: integer("champion_points").notNull().default(0),
  topScorerPoints: integer("top_scorer_points").notNull().default(0),
  locked: boolean("locked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBonusBetSchema = createInsertSchema(bonusBetsTable).omit({
  id: true,
  championPoints: true,
  topScorerPoints: true,
  locked: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBonusBet = z.infer<typeof insertBonusBetSchema>;
export type BonusBet = typeof bonusBetsTable.$inferSelect;
