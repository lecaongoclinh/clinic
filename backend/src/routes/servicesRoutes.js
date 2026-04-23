import express from "express";
import ServicesController from "../controllers/servicesController.js";

const router = express.Router();

// Dashboard + danh sách dịch vụ
router.get("/dashboard", ServicesController.getDashboard);
router.get("/", ServicesController.getAll);
router.get("/:id", ServicesController.getById);
router.post("/", ServicesController.create);
router.put("/:id", ServicesController.update);
router.delete("/:id", ServicesController.remove);

// Gói dịch vụ
router.get("/packages/all", ServicesController.getAllPackages);
router.get("/packages/:id", ServicesController.getPackageById);
router.post("/packages", ServicesController.createPackage);
router.put("/packages/:id", ServicesController.updatePackage);
router.delete("/packages/:id", ServicesController.removePackage);

// Cấu hình dịch vụ
router.get("/configs/all", ServicesController.getAllConfigs);
router.get("/configs/:serviceId", ServicesController.getConfigByServiceId);
router.put("/configs/:serviceId", ServicesController.upsertConfig);

export default router;