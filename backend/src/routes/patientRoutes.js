import express from 'express';
import patientController from '../controllers/patientController.js';

const router = express.Router();

// router.get('/', patientController.getPatients);
// router.get('/:id', patientController.getPatientById);

const patientRoutes = express.Router();

// Tìm kiếm bệnh nhân theo tên
patientRoutes.get('/search', patientController.searchByName);

// Lấy thông tin bệnh nhân
router.get('/:maBN', patientController.getById);

// Tạo bệnh nhân
router.post('/', patientController.create);

export default router;