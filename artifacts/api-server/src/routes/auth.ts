import { Router } from "express";
import bcrypt from "bcryptjs";
import { bolaoMembersTable, db, invitesTable, usersTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.session.userId!));

    if (!user) {
      req.session.destroy(() => {});
      res.status(401).json({ error: "Unauthorized", message: "Session invalid" });
      return;
    }

    res.json(user);
  } catch (err) {
    req.log.error({ err }, "Failed to get current user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: "Invalid request body" });
    return;
  }

  const { email, password, name, inviteToken } = parsed.data;

  try {
    const [invite] = await db
      .select()
      .from(invitesTable)
      .where(
        and(
          eq(invitesTable.token, inviteToken),
          eq(invitesTable.used, false),
          gt(invitesTable.expiresAt, new Date())
        )
      );

    if (!invite) {
      res.status(400).json({ error: "Bad request", message: "Invalid or expired invitation token" });
      return;
    }

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (existing.length > 0) {
      res.status(409).json({ error: "Conflict", message: "Email already in use" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await db
      .insert(usersTable)
      .values({ email, passwordHash, name, role: "participant" })
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      });

    await db
      .update(invitesTable)
      .set({ used: true })
      .where(eq(invitesTable.id, invite.id));

    if (invite.bolaoId) {
      await db.insert(bolaoMembersTable).values({
        bolaoId: invite.bolaoId,
        userId: user.id,
        role: "member",
      });
    }

    req.session.userId = user.id;
    req.session.userRole = user.role;

    res.status(201).json({ user, message: "Account created successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to register user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: "Invalid request body" });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
      return;
    }

    req.session.userId = user.id;
    req.session.userRole = user.role;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      message: "Logged in successfully",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to login");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
});

export default router;
