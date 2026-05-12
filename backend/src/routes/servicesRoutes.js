import express from "express";
import ServicesController from "../controllers/servicesController.js";

const router = express.Router();

router.get("/dashboard", ServicesController.getDashboard);

router.get("/packages/all", ServicesController.getAllPackages);
router.get("/packages/:id", ServicesController.getPackageById);
router.post("/packages", ServicesController.createPackage);
router.put("/packages/:id", ServicesController.updatePackage);
router.delete("/packages/:id", ServicesController.removePackage);

router.get("/configs/all", ServicesController.getAllConfigs);
router.get("/configs/:serviceId", ServicesController.getConfigByServiceId);
router.put("/configs/:serviceId", ServicesController.upsertConfig);

router.get("/clinical/all", ServicesController.getClinicalAssignable);

router.get("/", ServicesController.getAll);
router.post("/", ServicesController.create);
router.get("/:id", ServicesController.getById);
router.put("/:id", ServicesController.update);
router.delete("/:id", ServicesController.remove);

export default router;
