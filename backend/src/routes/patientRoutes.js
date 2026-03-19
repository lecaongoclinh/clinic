import express from 'express';
import patientController, { getPatients, getPatientById } from '../controllers/patientController.js';
// nếu có auth thì import thêm
// import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Lấy danh sách bệnh nhân
router.get('/', getPatients);

// Tìm kiếm bệnh nhân theo tên
router.get('/search', patientController.searchByName);

// Lấy thông tin bệnh nhân
router.get('/:id', getPatientById);

// Tạo bệnh nhân mới
router.post('/', patientController.create);

export default router;