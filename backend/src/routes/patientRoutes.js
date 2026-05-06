import express from 'express';
import patientController from '../controllers/patientController.js';

const router = express.Router();

router.get('/', patientController.list);
// router.get('/:id', patientController.getPatientById);

// Tìm kiếm bệnh nhân theo tên
router.get('/search', patientController.searchByName);

// Lấy thông tin bệnh nhân
router.get('/:maBN', patientController.getById);

// Tạo bệnh nhân
router.post('/', patientController.create);
router.put('/:maBN', patientController.update);
router.delete('/:maBN', patientController.delete);

export default router;
