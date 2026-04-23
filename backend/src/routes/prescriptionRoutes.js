import express from "express";
import PrescriptionController from "../controllers/prescriptionController.js";

const router = express.Router();

router.get("/", PrescriptionController.getAll);
router.get("/:id", PrescriptionController.getDetail);

export default router;