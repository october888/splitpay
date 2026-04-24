import { Router, type IRouter } from "express";
import healthRouter from "./health";
import splitsRouter from "./splits";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(splitsRouter);
router.use(statsRouter);

export default router;
