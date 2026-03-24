import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized", message: "You must be logged in" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized", message: "You must be logged in" });
    return;
  }
  if (req.session.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden", message: "Admin access required" });
    return;
  }
  next();
}

declare module "express-session" {
  interface SessionData {
    userId: number;
    userRole: string;
  }
}
