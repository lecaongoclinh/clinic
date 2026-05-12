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
            const workingSchedule = await appointmentsService.validateDoctorWorkingTime(maBacSi, ngayHen, gioHen);
            const appointmentId = await Appointment.createAppointment(maBN, maBacSi, ngayHen, gioHen, lyDoKham, workingSchedule.MaLich);
            return appointmentId;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    updateAppointment: async (maLK, maBN, maBacSi, ngayHen, gioHen, lyDoKham, trangThai) => {
        try {
            const workingSchedule = await appointmentsService.validateDoctorWorkingTime(maBacSi, ngayHen, gioHen);
            const success = await Appointment.updateAppointment(maLK, maBN, maBacSi, ngayHen, gioHen, lyDoKham, trangThai, workingSchedule.MaLich);
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
    },

    validateDoctorWorkingTime: async (maBacSi, ngayHen, gioHen) => {
        const workingSchedule = await Appointment.getDoctorWorkingSchedule(maBacSi, ngayHen, gioHen);
        if (!workingSchedule) {
            throw new Error('Giờ hẹn không nằm trong lịch làm việc của bác sĩ đã chọn');
        }

        return workingSchedule;
    }
}
export default appointmentsService;
