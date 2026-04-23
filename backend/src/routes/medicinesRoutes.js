import express from "express";
import MedicinesController from "../controllers/medicinesController.js";

const router = express.Router();

router.get("/", MedicinesController.getAll);

// ✅ ĐẶT LÊN TRÊN
router.get("/by-supplier", MedicinesController.getBySupplier);
router.get("/low-stock", MedicinesController.lowStock);

router.get("/:id", MedicinesController.getById);

router.post("/", MedicinesController.create);
router.put("/:id", MedicinesController.update);
router.delete("/:id", MedicinesController.delete);

export default router;