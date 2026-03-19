import express from 'express';
import { getPatients, getPatientById } from '../controllers/patientController.js';

const router = express.Router();

router.get('/', authenticateToken, getPatients);
router.get('/:id', authenticateToken, getPatientById);

import patientController from '../controllers/patientController.js';

const patientRoutes = express.Router();

// Tìm kiếm bệnh nhân theo tên
patientRoutes.get('/search', patientController.searchByName);

// Lấy thông tin bệnh nhân
patientRoutes.get('/:maBN', patientController.getById);

// Tạo bệnh nhân mới
patientRoutes.post('', patientController.create);

export default patientRoutes;
