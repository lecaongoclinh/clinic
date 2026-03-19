import express from "express";
import SuppliersController from "../controllers/suppliersController.js";

const router = express.Router();

router.get("/", SuppliersController.getAll);
router.get("/:id", SuppliersController.getById);
router.post("/", SuppliersController.create);
router.put("/:id", SuppliersController.update);
router.delete("/:id", SuppliersController.delete);

export default router;