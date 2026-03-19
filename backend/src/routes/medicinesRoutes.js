import express from "express";
import MedicinesController from "../controllers/medicinesController.js";

const router = express.Router();

router.get("/", MedicinesController.getAll);

// 🔥 NEW (phải đặt trước /:id)
router.get("/by-supplier", MedicinesController.getBySupplier);

router.get("/low-stock", MedicinesController.lowStock);
router.get("/:id", MedicinesController.getById);
router.post("/", MedicinesController.create);
router.put("/:id", MedicinesController.update);
router.delete("/:id", MedicinesController.delete);
router.get("/by-supplier", MedicinesController.getBySupplier);
// medicinesRouter.js

export default router;