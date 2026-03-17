import scheduleService from '../services/scheduleService.js';

const scheduleController = {
    // Create a new schedule
    createSchedule: async (req, res) => {
        try {
            const { bacSiId, ngayLamViec, gioBatDau, gioKetThuc, phongKhamId } = req.body;

            // Validate required fields
            if (!bacSiId || !ngayLamViec || !gioBatDau || !gioKetThuc || !phongKhamId) {
                return res.status(400).json({
                    error: "Vui lòng cung cấp đầy đủ thông tin: bacSiId, ngayLamViec, gioBatDau, gioKetThuc, phongKhamId"
                });
            }

            // Validate date format (YYYY-MM-DD)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(ngayLamViec)) {
                return res.status(400).json({
                    error: "Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng: YYYY-MM-DD"
                });
            }

            // Validate time format (HH:MM or HH:MM:SS)
            if (!/^\d{2}:\d{2}(:\d{2})?$/.test(gioBatDau) || !/^\d{2}:\d{2}(:\d{2})?$/.test(gioKetThuc)) {
                return res.status(400).json({
                    error: "Định dạng giờ không hợp lệ. Vui lòng sử dụng định dạng: HH:MM hoặc HH:MM:SS"
                });
            }

            // Validate numeric fields
            if (isNaN(bacSiId) || isNaN(phongKhamId)) {
                return res.status(400).json({
                    error: "bacSiId và phongKhamId phải là các số"
                });
            }

            const result = await scheduleService.createSchedule(
                bacSiId,
                phongKhamId,
                ngayLamViec,
                gioBatDau,
                gioKetThuc
            );

            res.status(201).json(result);
        } catch (error) {
            res.status(400).json({
                error: error.message
            });
        }
    },

    // Get all schedules for a doctor
    getSchedulesByDoctor: async (req, res) => {
        try {
            const { bacSiId } = req.params;

            if (!bacSiId || isNaN(bacSiId)) {
                return res.status(400).json({
                    error: "bacSiId không hợp lệ"
                });
            }

            const schedules = await scheduleService.getSchedulesByDoctor(bacSiId);
            res.status(200).json({
                success: true,
                data: schedules,
                total: schedules.length
            });
        } catch (error) {
            res.status(500).json({
                error: error.message
            });
        }
    },

    // Get schedule by ID
    getScheduleById: async (req, res) => {
        try {
            const { maLich } = req.params;

            if (!maLich || isNaN(maLich)) {
                return res.status(400).json({
                    error: "maLich không hợp lệ"
                });
            }

            const schedule = await scheduleService.getScheduleById(maLich);
            res.status(200).json({
                success: true,
                data: schedule
            });
        } catch (error) {
            res.status(404).json({
                error: error.message
            });
        }
    },

    // Delete schedule
    deleteSchedule: async (req, res) => {
        try {
            const { maLich } = req.params;

            if (!maLich || isNaN(maLich)) {
                return res.status(400).json({
                    error: "maLich không hợp lệ"
                });
            }

            const result = await scheduleService.deleteSchedule(maLich);
            res.status(200).json(result);
        } catch (error) {
            res.status(404).json({
                error: error.message
            });
        }
    },

    // Get filtered schedules by specialty, doctor, date range
    getFilteredSchedules: async (req, res) => {
        try {
            const { maChuyenKhoa, maBacSi, dateFrom, dateTo } = req.query;

            // Optional numeric validation
            const parsedMaChuyenKhoa = maChuyenKhoa && !isNaN(maChuyenKhoa) ? parseInt(maChuyenKhoa) : null;
            const parsedMaBacSi = maBacSi && !isNaN(maBacSi) ? parseInt(maBacSi) : null;

            // Date validation
            if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
                return res.status(400).json({ error: "dateFrom không hợp lệ (YYYY-MM-DD)" });
            }
            if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
                return res.status(400).json({ error: "dateTo không hợp lệ (YYYY-MM-DD)" });
            }

            const schedules = await scheduleService.getFilteredSchedules(
                parsedMaChuyenKhoa,
                parsedMaBacSi,
                dateFrom || null,
                dateTo || null
            );

            res.status(200).json({
                success: true,
                data: schedules,
                total: schedules.length,
                filters: {
                    maChuyenKhoa: parsedMaChuyenKhoa,
                    maBacSi: parsedMaBacSi,
                    dateFrom,
                    dateTo
                }
            });
        } catch (error) {
            res.status(500).json({
                error: error.message
            });
        }
    }
};

export default scheduleController;
