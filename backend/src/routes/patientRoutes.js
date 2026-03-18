import express from 'express';
import { getPatients, getPatientById } from '../controllers/patientController.js';

const router = express.Router();

router.get('/', authenticateToken, getPatients);
router.get('/:id', authenticateToken, getPatientById);

export default router;