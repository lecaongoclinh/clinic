import express from "express";
import BatchController from "../controllers/batchController.js";

const router = express.Router();

router.get("/", BatchController.getAll);
router.get("/expired", BatchController.getExpired);

export default router;