import express from 'express';
import {
    searchPatients,
    getSpecialties,
    getDoctorsBySpecialty,
    getPatientAppointments,
    createWalkInTicket,
    createAppointmentTicket,
    getWaitingTickets,
    callNextPatient,
    registerNewPatient  // Thêm import này
} from '../controllers/ticketController.js';

const router = express.Router();

// Tìm kiếm bệnh nhân
router.get('/patients/search', searchPatients);

// Đăng ký bệnh nhân mới
router.post('/patients/register', registerNewPatient);

// Lấy danh sách chuyên khoa
router.get('/specialties', getSpecialties);

// Lấy danh sách bác sĩ theo chuyên khoa
router.get('/doctors/specialty/:specialtyId', getDoctorsBySpecialty);

// Lấy danh sách lịch hẹn của bệnh nhân 
router.get('/patients/:patientId/appointments', getPatientAppointments);

// Tạo phiếu khám tại chỗ
router.post('/walk-in', createWalkInTicket);

// Tạo phiếu khám từ lịch hẹn
router.post('/appointment', createAppointmentTicket);

// Lấy danh sách phiếu khám đang chờ
router.get('/waiting', getWaitingTickets);

// Gọi bệnh nhân tiếp theo
router.post('/call-next', callNextPatient);

export default router;