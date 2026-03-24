import { Router } from "express";
import { db, invitesTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

const router = Router();

router.get("/:token", async (req, res) => {
  const { token } = req.params;

  try {
    const [invite] = await db
      .select()
      .from(invitesTable)
      .where(
        and(
          eq(invitesTable.token, token),
          eq(invitesTable.used, false),
          gt(invitesTable.expiresAt, new Date())
        )
      );

    if (!invite) {
      res.status(404).json({ error: "Not found", message: "Invitation not found or has expired" });
      return;
    }

    res.json({ valid: true, email: invite.email });
  } catch (err) {
    req.log.error({ err }, "Failed to validate invite token");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
