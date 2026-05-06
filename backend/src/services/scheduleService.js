import db from "../config/db.js";
import Schedule from "../models/scheduleModel.js";

const scheduleService = {
    // Create a new schedule with validations
    createSchedule: async (bacSiId, phongKhamId, ngayLamViec, gioBatDau, gioKetThuc) => {
        let connection;
        let committed = false;
        try {
            connection = await db.getConnection();
            await connection.beginTransaction();

            // Validate doctor exists
            const doctor = await Schedule.checkDoctorExists(bacSiId, connection, true);
            if (!doctor) {
                throw new Error("Bác sĩ không tồn tại");
            }

            // Validate room exists
            const room = await Schedule.checkRoomExists(phongKhamId, connection, true);
            if (!room) {
                throw new Error("Phòng khám không tồn tại");
            }

            if (!room.MaChuyenKhoa || Number(room.MaChuyenKhoa) !== Number(doctor.MaChuyenKhoa)) {
                throw new Error("Phòng khám không thuộc chuyên khoa của bác sĩ");
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
                gioKetThuc,
                connection
            );
            if (conflict) {
                const existing = conflict[0];
                throw new Error(`Bác sĩ ${existing.TenBacSi} đã có lịch làm việc ngày ${ngayLamViec} từ ${existing.GioBatDau} đến ${existing.GioKetThuc}`);
            }

            // Check room conflict
            const roomConflict = await Schedule.checkRoomConflict(
                phongKhamId,
                ngayLamViec,
                gioBatDau,
                gioKetThuc,
                connection
            );
            if (roomConflict) {
                const existing = roomConflict[0];
                throw new Error(`Phòng ${existing.TenPhong} đã được bác sĩ ${existing.TenBacSi} sử dụng ngày ${ngayLamViec} từ ${existing.GioBatDau} đến ${existing.GioKetThuc}`);
            }

            const result = await Schedule.createSchedule(bacSiId, phongKhamId, ngayLamViec, gioBatDau, gioKetThuc, connection);

            // Get the created schedule
            await connection.commit();
            committed = true;

            const schedule = await Schedule.getScheduleById(result.insertId);

            return {
                success: true,
                message: "Lịch làm việc tạo thành công",
                data: schedule
            };
        } catch (error) {
            if (connection && !committed) {
                await connection.rollback();
            }
            throw new Error(error.message);
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },
    // Get all rooms
    getRooms: async (maChuyenKhoa = null) => {
        try {
            return await Schedule.getAllRooms(maChuyenKhoa);
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Get available rooms for a date/time range
    getAvailableRooms: async (ngayLam, gioBatDau, gioKetThuc, maChuyenKhoa = null) => {
        try {
            return await Schedule.getAvailableRooms(ngayLam, gioBatDau, gioKetThuc, maChuyenKhoa);
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
    },

    // Get doctors by specialty and specific date
    getDoctorsBySpecialtyAndDate: async (maChuyenKhoa, ngayLam) => {
        try {
            const doctors = await Schedule.getDoctorsBySpecialtyAndDate(maChuyenKhoa, ngayLam);
            return doctors;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

export default scheduleService;
