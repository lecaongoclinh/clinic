import express from 'express';
import scheduleController from '../controllers/scheduleController.js';

const scheduleRoutes = express.Router();

// ✅ Route tĩnh đặt TRƯỚC route động
scheduleRoutes.post('/', scheduleController.createSchedule);

// Get filtered schedules - đổi từ '/' thành '/filter'
scheduleRoutes.get('/filter', scheduleController.getFilteredSchedules);

// Get all schedules for a doctor
scheduleRoutes.get('/doctor/:bacSiId', scheduleController.getSchedulesByDoctor);

// ✅ Route động đặt SAU
scheduleRoutes.get('/:maLich', scheduleController.getScheduleById);
scheduleRoutes.delete('/:maLich', scheduleController.deleteSchedule);

export default scheduleRoutes;