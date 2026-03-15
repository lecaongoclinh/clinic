import Appointment from '../models/appointmentsModel.js';

const appointmentsService = {
    getAppointments: async (maChuyenKhoa, maBacSi) => {
        try{
            const appointments = await Appointment.getAppointments(maChuyenKhoa, maBacSi);
            return appointments;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

export default appointmentsService;