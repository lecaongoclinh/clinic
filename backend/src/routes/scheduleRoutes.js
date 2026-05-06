import express from 'express';
import scheduleController from '../controllers/scheduleController.js';

const scheduleRoutes = express.Router();

// ✅ Route tĩnh đặt TRƯỚC route động
scheduleRoutes.post('/', scheduleController.createSchedule);

// Get doctors by specialty and date (for appointment booking)
scheduleRoutes.get('/doctors-by-date', scheduleController.getDoctorsBySpecialtyAndDate);

// Get all clinic rooms
scheduleRoutes.get('/rooms', scheduleController.getRooms);

// Get rooms that are free for a date/time range
scheduleRoutes.get('/available-rooms', scheduleController.getAvailableRooms);

// Get filtered schedules - đổi từ '/' thành '/filter'
scheduleRoutes.get('/filter', scheduleController.getFilteredSchedules);

// Get all schedules for a doctor
scheduleRoutes.get('/doctor/:bacSiId', scheduleController.getSchedulesByDoctor);

// ✅ Route động đặt SAU
scheduleRoutes.get('/:maLich', scheduleController.getScheduleById);
scheduleRoutes.delete('/:maLich', scheduleController.deleteSchedule);

export default scheduleRoutes;
