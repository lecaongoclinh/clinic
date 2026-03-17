 import Schedule from "../models/scheduleModel.js";

const scheduleService = {
    // Create a new schedule with validations
    createSchedule: async (bacSiId, phongKhamId, ngayLamViec, gioBatDau, gioKetThuc) => {
        try {
            // Validate doctor exists
            const doctor = await Schedule.checkDoctorExists(bacSiId);
            if (!doctor) {
                throw new Error("Bác sĩ không tồn tại");
            }

            // Validate room exists
            const room = await Schedule.checkRoomExists(phongKhamId);
            if (!room) {
                throw new Error("Phòng khám không tồn tại");
            }

            // Validate start time < end time
            if (gioBatDau >= gioKetThuc) {
                throw new Error("Giờ bắt đầu phải nhỏ hơn giờ kết thúc");
            }

            // Check for schedule conflict
            const conflict = await Schedule.checkScheduleConflict(
                bacSiId,
                ngayLamViec,
                gioBatDau,
                gioKetThuc
            );
            // ✅ Thêm dòng này
            const result = await Schedule.createSchedule(bacSiId, phongKhamId, ngayLamViec, gioBatDau, gioKetThuc);

            // Get the created schedule
            const schedule = await Schedule.getScheduleById(result.insertId);

            return {
                success: true,
                message: "Lịch làm việc tạo thành công",
                data: schedule
            };
        } catch (error) {
            throw new Error(error.message);
        }
    },
    // Get all schedules by doctor
    getSchedulesByDoctor: async (bacSiId) => {
        try {
            const schedules = await Schedule.getSchedulesByDoctor(bacSiId);
            return schedules;
        } catch (error) {
            throw new Error(error.message);
        }
    },
  // Get schedule by ID
    getScheduleById: async (maLich) => {
        try {
            const schedule = await Schedule.getScheduleById(maLich);
            if (!schedule) {
                throw new Error("Lịch làm việc không tồn tại");
            }
            return schedule;
        } catch (error) {
            throw new Error(error.message);
        }
    },
    deleteSchedule: async (maLich) => {
        try {
            const schedule = await Schedule.getScheduleById(maLich);
            if (!schedule) {
                throw new Error("Lịch làm việc không tồn tại");
            }

            await Schedule.deleteSchedule(maLich);

            return {
                success: true,
                message: "Lịch làm việc đã được xóa"
            };
        } catch (error) {
            throw new Error(error.message);
        }
    },

        getFilteredSchedules: async (maChuyenKhoa, maBacSi, dateFrom, dateTo) => {
        try {
            const schedules = await Schedule.getFilteredSchedules(maChuyenKhoa, maBacSi, dateFrom, dateTo);
            return schedules;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

export default scheduleService;