import specialtyController from "../controllers/specialtyController.js";
import express from 'express';

const specialtyRoutes = express.Router();

specialtyRoutes.get('', specialtyController.getAll);

export default specialtyRoutes;