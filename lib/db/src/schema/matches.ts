import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const matchStageEnum = pgEnum("match_stage", [
  "group",
  "round_of_16",
  "quarterfinal",
  "semifinal",
  "final",
  "third_place",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "upcoming",
  "live",
  "finished",
]);

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  homeTeamFlag: text("home_team_flag"),
  awayTeamFlag: text("away_team_flag"),
  matchDate: timestamp("match_date").notNull(),
  stage: matchStageEnum("stage").notNull(),
  groupName: text("group_name"),
  venue: text("venue"),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  status: matchStatusEnum("status").notNull().default("upcoming"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({
  id: true,
  homeScore: true,
  awayScore: true,
  status: true,
  createdAt: true,
});

export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matchesTable.$inferSelect;
