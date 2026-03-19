import express from "express";
import ImportsController from "../controllers/importsController.js";

const router = express.Router();

router.get("/by-supplier", ImportsController.getBySupplier);

router.get("/", ImportsController.getAll);
router.get("/:id/items", ImportsController.getItems);
router.get("/:id", ImportsController.getById);

router.post("/", ImportsController.create);
router.post("/:id/items", ImportsController.addItem);

export default router;