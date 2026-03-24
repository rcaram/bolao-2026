import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams";
import { groupsTable } from "./groups";

export const matchStageEnum = pgEnum("match_stage", [
  "group",
  "round_of_32",
  "round_of_16",
  "quarterfinal",
  "semifinal",
  "third_place",
  "final",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "upcoming",
  "live",
  "finished",
]);

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  homeTeamId: integer("home_team_id").references(() => teamsTable.id, { onDelete: "set null" }),
  awayTeamId: integer("away_team_id").references(() => teamsTable.id, { onDelete: "set null" }),
  homePlaceholder: text("home_placeholder"),
  awayPlaceholder: text("away_placeholder"),
  groupId: integer("group_id").references(() => groupsTable.id, { onDelete: "set null" }),
  matchDate: timestamp("match_date").notNull(),
  stage: matchStageEnum("stage").notNull(),
  matchNumber: integer("match_number"),
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
