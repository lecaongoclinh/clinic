import Appointment from '../models/appointmentsModel.js';

const appointmentsService = {
    getAppointments: async (tenBN, maChuyenKhoa, maBacSi) => {
        try{
            const appointments = await Appointment.getAppointments(tenBN, maChuyenKhoa, maBacSi);
            return appointments;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    createAppointment: async (maBN, maBacSi, ngayHen, gioHen, lyDoKham) => {
        try {
            const appointmentId = await Appointment.createAppointment(maBN, maBacSi, ngayHen, gioHen, lyDoKham);
            return appointmentId;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    updateAppointment: async (maLK, maBN, maBacSi, ngayHen, gioHen, lyDoKham, trangThai) => {
        try {
            const success = await Appointment.updateAppointment(maLK, maBN, maBacSi, ngayHen, gioHen, lyDoKham, trangThai);
            return success;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    deleteAppointment: async (maLK) => {
        try {
            const success = await Appointment.deleteAppointment(maLK);
            return success;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}
export default appointmentsService;