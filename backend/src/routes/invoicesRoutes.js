import express from "express";
import InvoicesController from "../controllers/invoicesController.js";

const router = express.Router();

router.get("/dashboard", InvoicesController.getDashboard);
router.get("/", InvoicesController.getAll);
router.get("/:id/details", InvoicesController.getDetails);
router.get("/:id", InvoicesController.getById);

router.post("/", InvoicesController.create);
router.post("/visits/:ticketId/services", InvoicesController.addVisitServices);
router.put("/:id", InvoicesController.update);
router.put("/:id/pay", InvoicesController.pay);
router.put("/:id/cancel", InvoicesController.cancel);
router.put("/:id/refund", InvoicesController.refund);
router.delete("/:id", InvoicesController.remove);

export default router;
