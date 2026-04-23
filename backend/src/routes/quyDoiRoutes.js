import express from "express";
import QuyDoiController from "../controllers/quyDoiController.js";

const router = express.Router();

router.get("/", QuyDoiController.getByMedicine);

export default router;