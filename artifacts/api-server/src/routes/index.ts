import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import matchesRouter from "./matches";
import betsRouter from "./bets";
import rankingsRouter from "./rankings";
import adminRouter from "./admin";
import bonusesRouter from "./bonuses";
import inviteRouter from "./invite";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/matches", matchesRouter);
router.use("/bets", betsRouter);
router.use("/rankings", rankingsRouter);
router.use("/admin", adminRouter);
router.use("/bonuses", bonusesRouter);
router.use("/invite", inviteRouter);

export default router;
