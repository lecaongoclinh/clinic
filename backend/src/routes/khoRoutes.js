import express from "express";
import KhoController from "../controllers/khoController.js";

const router = express.Router();

router.get("/", KhoController.getAll);

export default router;