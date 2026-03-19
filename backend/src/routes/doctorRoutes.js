import doctorController from "../controllers/doctorController.js";
import express from 'express';
const doctorRoutes = express.Router();
doctorRoutes.get('/doctor-by-specialty', doctorController.getDoctorsBySpecialty);
doctorRoutes.get('', doctorController.getAllDoctors);
export default doctorRoutes;