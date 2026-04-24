import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import groupsRouter from "./groups";
import teamsRouter from "./teams";
import matchesRouter from "./matches";
import adminRouter from "./admin";
import inviteRouter from "./invite";
import standingsRouter from "./standings";
import boloesRouter from "./boloes";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/groups", groupsRouter);
router.use("/teams", teamsRouter);
router.use("/matches", matchesRouter);
router.use("/admin", adminRouter);
router.use("/invite", inviteRouter);
router.use("/standings", standingsRouter);
router.use("/boloes", boloesRouter);

export default router;
