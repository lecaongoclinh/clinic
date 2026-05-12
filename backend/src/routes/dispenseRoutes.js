import express from "express";
import DispenseController from "../controllers/dispenseController.js";

const router = express.Router();

router.get("/bootstrap", DispenseController.getBootstrap);
router.get("/dispense-warehouse", DispenseController.getDispenseWarehouse);
router.get("/catalog", DispenseController.getCatalog);
router.get("/catalog/:id/preview", DispenseController.getMedicinePreview);
router.get("/return-lots", DispenseController.getReturnableSupplierLots);
router.get("/prescriptions/pending", DispenseController.getPendingPrescriptions);
router.get("/prescriptions/:id", DispenseController.getPrescriptionDetail);
router.get("/suggestions/:id", DispenseController.getAlternativeMedicines);
router.get("/history", DispenseController.getRecentHistory);
router.post("/", DispenseController.saveDraft);
router.get("/:id", DispenseController.getDraftById);
router.post("/:id/complete", DispenseController.completeDraft);

export default router;
