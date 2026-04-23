import express from "express";
import BatchController from "../controllers/batchController.js";

const router = express.Router();

router.get("/", BatchController.getAll);

// QUAN TRỌNG NHẤT
router.get("/by-medicine/:MaThuoc", BatchController.getByMedicine);
router.get("/medicine/:id", BatchController.getByMedicine);
router.get("/expired", BatchController.getExpired);
router.get("/near-expiry", BatchController.getNearExpiry);

// ===== INVENTORY ACTION =====

// chi tiết lô
router.get("/:id", BatchController.getById);

// update
router.put("/:id", BatchController.update);

// xóa (hủy)
router.delete("/:id", BatchController.delete);

// chuyển kho
router.post("/transfer", BatchController.transfer);

export default router;