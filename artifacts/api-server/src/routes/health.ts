import { Router, type IRouter, type RequestHandler } from "express";

const router: IRouter = Router();
const healthHandler: RequestHandler = (_req, res) => {
  res.json({ status: "ok" });
};

router.get("/healthz", healthHandler);

export default router;
