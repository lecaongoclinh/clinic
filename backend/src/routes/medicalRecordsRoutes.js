import express from 'express';
import MedicalRecordsController from '../controllers/medicalRecordsController.js';

const router = express.Router();

// Lấy danh sách bệnh nhân đã khám theo khoa
router.get('/patients-by-specialty', MedicalRecordsController.getPatientsBySpecialty);

// Lấy tất cả bệnh nhân đã khám
router.get('/all-patients', MedicalRecordsController.getAllPatientsWithRecords);

// Lấy danh sách chuyên khoa
router.get('/specialties', MedicalRecordsController.getAllSpecialties);

// Lấy chi tiết các lần khám của bệnh nhân
router.get('/history/:maBN', MedicalRecordsController.getMedicalHistory);

// Lấy chi tiết bệnh án
router.get('/:maBA', MedicalRecordsController.getMedicalRecordDetail);

// Cập nhật bệnh án
router.put('/:maBA', MedicalRecordsController.updateMedicalRecord);

// Tạo bệnh án mới
router.post('/', MedicalRecordsController.createMedicalRecord);

export default router;
