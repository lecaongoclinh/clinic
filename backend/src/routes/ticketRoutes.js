import express from 'express';
import {
    searchPatients,
    getSpecialties,
    getDoctorsBySpecialty,
    getPatientAppointments,
    createWalkInTicket,
    createAppointmentTicket,  
    getWaitingTickets,
} from '../controllers/ticketController.js';

const router = express.Router();

// Tìm kiếm bệnh nhân
router.get('/patients/search', searchPatients);

// Lấy danh sách chuyên khoa
router.get('/specialties', getSpecialties);

// Lấy danh sách bác sĩ theo chuyên khoa
router.get('/doctors/specialty/:specialtyId', getDoctorsBySpecialty);

// Lấy danh sách lịch hẹn của bệnh nhân 
router.get('/patients/:patientId/appointments', getPatientAppointments);

// Tạo phiếu khám tại chỗ
router.post('/walk-in', createWalkInTicket);  // SỬA: bỏ /tickets vì đã có prefix

// Tạo phiếu khám từ lịch hẹn - THIẾU route này
router.post('/appointment', createAppointmentTicket);  // THÊM route này

// Lấy danh sách phiếu khám đang chờ
router.get('/waiting', getWaitingTickets);  // SỬA: bỏ /tickets vì đã có prefix

export default router;