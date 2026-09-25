import { Router, type IRouter } from "express";
import healthRouter from "./health";
import balanceRouter from "./balance";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(balanceRouter);
router.use(adminRouter);

export default router;
