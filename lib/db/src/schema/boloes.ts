import { pgEnum, pgTable, serial, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const bolaoRoleEnum = pgEnum("bolao_role", ["admin", "member"]);

export const boloesTable = pgTable("boloes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: integer("created_by")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bolaoMembersTable = pgTable(
  "bolao_members",
  {
    id: serial("id").primaryKey(),
    bolaoId: integer("bolao_id")
      .notNull()
      .references(() => boloesTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: bolaoRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => ({
    bolaoUserUniqueIdx: uniqueIndex("bolao_members_bolao_id_user_id_uidx").on(table.bolaoId, table.userId),
  })
);

export const bolaoScoringConfigsTable = pgTable("bolao_scoring_configs", {
  id: serial("id").primaryKey(),
  bolaoId: integer("bolao_id")
    .notNull()
    .references(() => boloesTable.id, { onDelete: "cascade" })
    .unique(),
  exactScore: integer("exact_score").notNull().default(10),
  correctOutcomeGoalDiff: integer("correct_outcome_goal_diff").notNull().default(7),
  correctOutcome: integer("correct_outcome").notNull().default(5),
  wrongOutcome: integer("wrong_outcome").notNull().default(0),
  bonusChampion: integer("bonus_champion").notNull().default(15),
  bonusTopScorer: integer("bonus_top_scorer").notNull().default(10),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
