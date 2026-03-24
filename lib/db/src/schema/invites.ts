import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invitesTable = pgTable("invites", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInviteSchema = createInsertSchema(invitesTable).omit({
  id: true,
  used: true,
  createdAt: true,
});

export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type Invite = typeof invitesTable.$inferSelect;
