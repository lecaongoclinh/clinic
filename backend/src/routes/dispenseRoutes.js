import express from "express";
import DispenseController from "../controllers/dispenseController.js";

const router = express.Router();

router.post("/:id", DispenseController.dispense);

export default router;