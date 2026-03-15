import express from 'express';
import appointmentController from '../controllers/appointmentsController.js';

const appointmentRoutes = express.Router();
appointmentRoutes.get('', appointmentController.getAppointments);

export default appointmentRoutes;