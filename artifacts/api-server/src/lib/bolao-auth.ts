import { bolaoMembersTable, db } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";

function parseBolaoId(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

export function getBolaoIdFromParams(req: Request): number | null {
  return parseBolaoId(req.params.bolaoId as string | undefined);
}

export async function isBolaoMember(userId: number, bolaoId: number): Promise<boolean> {
  const [membership] = await db
    .select({ id: bolaoMembersTable.id })
    .from(bolaoMembersTable)
    .where(and(eq(bolaoMembersTable.userId, userId), eq(bolaoMembersTable.bolaoId, bolaoId)));
  return Boolean(membership);
}

export async function requireBolaoMember(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", message: "You must be logged in" });
    return;
  }

  const bolaoId = getBolaoIdFromParams(req);
  if (!bolaoId) {
    res.status(400).json({ error: "Bad request", message: "Invalid bolao ID" });
    return;
  }

  if (req.session.userRole === "admin") {
    next();
    return;
  }

  if (!(await isBolaoMember(userId, bolaoId))) {
    res.status(403).json({ error: "Forbidden", message: "Bolao membership required" });
    return;
  }

  next();
}

export async function requireBolaoAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", message: "You must be logged in" });
    return;
  }

  const bolaoId = getBolaoIdFromParams(req);
  if (!bolaoId) {
    res.status(400).json({ error: "Bad request", message: "Invalid bolao ID" });
    return;
  }

  if (req.session.userRole === "admin") {
    next();
    return;
  }

  const [membership] = await db
    .select({ role: bolaoMembersTable.role })
    .from(bolaoMembersTable)
    .where(and(eq(bolaoMembersTable.userId, userId), eq(bolaoMembersTable.bolaoId, bolaoId)));

  if (!membership || membership.role !== "admin") {
    res.status(403).json({ error: "Forbidden", message: "Bolao admin access required" });
    return;
  }

  next();
}
