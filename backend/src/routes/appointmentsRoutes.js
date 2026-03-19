import express from 'express';
import appointmentController from '../controllers/appointmentsController.js';

const appointmentRoutes = express.Router();
appointmentRoutes.get('', appointmentController.getAppointments);
appointmentRoutes.post('', appointmentController.createAppointment);
appointmentRoutes.put('/:maLK', appointmentController.updateAppointment);
appointmentRoutes.delete('/:maLK', appointmentController.deleteAppointment);

export default appointmentRoutes;