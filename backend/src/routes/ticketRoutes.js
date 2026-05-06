import express from 'express';
import {
    searchPatients,
    createPatient,
    getSpecialties,
    getDoctorsBySpecialty,
    getRooms,
    getPatientAppointments,
    createTicket,
    createWalkInTicket,
    createAppointmentTicket,
    getWaitingTickets,
    getTicketById,
    cancelTicket,
    callNextPatient
} from '../controllers/ticketController.js';

const router = express.Router();

router.get('/patients/search', searchPatients);
router.post('/patients', createPatient);
router.get('/patients/:patientId/appointments', getPatientAppointments);

router.get('/specialties', getSpecialties);
router.get('/doctors/specialty/:specialtyId', getDoctorsBySpecialty);
router.get('/rooms', getRooms);

router.post('/tickets', createTicket);
router.post('/tickets/walk-in', createWalkInTicket);
router.post('/tickets/appointment', createAppointmentTicket);
router.get('/tickets/waiting', getWaitingTickets);
router.get('/tickets/:ticketId', getTicketById);
router.patch('/tickets/:ticketId/cancel', cancelTicket);
router.post('/tickets/call-next', callNextPatient);

export default router;
