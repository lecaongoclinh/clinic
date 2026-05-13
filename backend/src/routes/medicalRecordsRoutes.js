import express from 'express';
import jwt from 'jsonwebtoken';
import MedicalRecordsController from '../controllers/medicalRecordsController.js';

const router = express.Router();

const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ' });
    }
};

// Lấy danh sách bệnh án
router.get('/', MedicalRecordsController.getMedicalRecords);

// Lấy phiếu khám có thể lập bệnh án
router.get('/exam-tickets', MedicalRecordsController.getEligibleExamTickets);

// Lấy danh sách bệnh nhân đã khám theo khoa
router.get('/patients-by-specialty', MedicalRecordsController.getPatientsBySpecialty);

// Lấy tất cả bệnh nhân đã khám
router.get('/all-patients', MedicalRecordsController.getAllPatientsWithRecords);

// Lấy danh sách chuyên khoa
router.get('/specialties', MedicalRecordsController.getAllSpecialties);

// Lấy chi tiết các lần khám của bệnh nhân
router.get('/history/:maBN', MedicalRecordsController.getMedicalHistory);

// Lấy lịch sử bệnh án theo bệnh nhân
router.get('/patient/:patientId', MedicalRecordsController.getMedicalHistoryByPatient);

router.get('/ticket/:maPK/workspace', requireAuth, MedicalRecordsController.getExamWorkspace);
router.put('/ticket/:maPK', requireAuth, MedicalRecordsController.upsertMedicalRecordForTicket);

// Lấy chi tiết bệnh án
router.get('/:maBA', MedicalRecordsController.getMedicalRecordDetail);

// Cập nhật bệnh án
router.put('/:maBA', requireAuth, MedicalRecordsController.updateMedicalRecord);

// Tạo bệnh án mới
router.post('/', requireAuth, MedicalRecordsController.createMedicalRecord);

export default router;
