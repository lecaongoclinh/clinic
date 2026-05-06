import db from '../config/db.js';

const Schedule = {
    // Create a new doctor schedule
    createSchedule: async (maBacSi, maPhong, ngayLam, gioBatDau, gioKetThuc, connection = db) => {
        const query = `
            INSERT INTO LichLamViecBacSi (MaBacSi, MaPhong, NgayLam, GioBatDau, GioKetThuc)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await connection.execute(query, [maBacSi, maPhong, ngayLam, gioBatDau, gioKetThuc]);
        return result;
    },

    // Check if doctor exists
    checkDoctorExists: async (maBacSi, connection = db, forUpdate = false) => {
        const query = `
            SELECT MaNV, HoTen, MaVaiTro
            FROM NhanVien
            WHERE MaNV = ? AND MaVaiTro = (SELECT MaVaiTro FROM VaiTro WHERE TenVaiTro = 'Bac Si')
            ${forUpdate ? 'FOR UPDATE' : ''}
        `;
        const [rows] = await connection.execute(query, [maBacSi]);
        return rows.length > 0 ? rows[0] : null;
    },

    // Check if room exists
    checkRoomExists: async (maPhong, connection = db, forUpdate = false) => {
        const query = `SELECT MaPhong, TenPhong FROM PhongKham WHERE MaPhong = ? ${forUpdate ? 'FOR UPDATE' : ''}`;
        const [rows] = await connection.execute(query, [maPhong]);
        return rows.length > 0 ? rows[0] : null;
    },

    // Get all clinic rooms
    getAllRooms: async () => {
        const query = `
            SELECT MaPhong, TenPhong, GhiChu
            FROM PhongKham
            ORDER BY TenPhong ASC
        `;
        const [rows] = await db.execute(query);
        return rows;
    },

    // Check for overlapping schedules
    checkScheduleConflict: async (maBacSi, ngayLam, gioBatDau, gioKetThuc, connection = db) => {
        const query = `
            SELECT
                l.MaLich,
                l.MaBacSi,
                n.HoTen as TenBacSi,
                l.MaPhong,
                p.TenPhong,
                l.NgayLam,
                l.GioBatDau,
                l.GioKetThuc
            FROM LichLamViecBacSi l
            JOIN NhanVien n ON l.MaBacSi = n.MaNV
            JOIN PhongKham p ON l.MaPhong = p.MaPhong
            WHERE l.MaBacSi = ?
            AND DATE(l.NgayLam) = DATE(?)
            AND (? < l.GioKetThuc AND ? > l.GioBatDau)
        `;
        const [rows] = await connection.execute(query, [maBacSi, ngayLam, gioBatDau, gioKetThuc]);
        return rows.length > 0 ? rows : null;
    },

    // Check if a room is already assigned to any doctor in an overlapping time range
    checkRoomConflict: async (maPhong, ngayLam, gioBatDau, gioKetThuc, connection = db) => {
        const query = `
            SELECT
                l.MaLich,
                l.MaBacSi,
                n.HoTen as TenBacSi,
                l.MaPhong,
                p.TenPhong,
                l.NgayLam,
                l.GioBatDau,
                l.GioKetThuc
            FROM LichLamViecBacSi l
            JOIN NhanVien n ON l.MaBacSi = n.MaNV
            JOIN PhongKham p ON l.MaPhong = p.MaPhong
            WHERE l.MaPhong = ?
            AND DATE(l.NgayLam) = DATE(?)
            AND (? < l.GioKetThuc AND ? > l.GioBatDau)
        `;
        const [rows] = await connection.execute(query, [maPhong, ngayLam, gioBatDau, gioKetThuc]);
        return rows.length > 0 ? rows : null;
    },

    // Get rooms that are free in a given time range
    getAvailableRooms: async (ngayLam, gioBatDau, gioKetThuc) => {
        const query = `
            SELECT p.MaPhong, p.TenPhong, p.GhiChu
            FROM PhongKham p
            WHERE NOT EXISTS (
                SELECT 1
                FROM LichLamViecBacSi l
                WHERE l.MaPhong = p.MaPhong
                AND DATE(l.NgayLam) = DATE(?)
                AND (? < l.GioKetThuc AND ? > l.GioBatDau)
            )
            ORDER BY p.TenPhong ASC
        `;
        const [rows] = await db.execute(query, [ngayLam, gioBatDau, gioKetThuc]);
        return rows;
    },

    // Get schedule by ID
    getScheduleById: async (maLich) => {
        const query = `
            SELECT
                l.MaLich,
                l.MaBacSi,
                n.HoTen as TenBacSi,
                l.MaPhong,
                p.TenPhong,
                l.NgayLam,
                l.GioBatDau,
                l.GioKetThuc
            FROM LichLamViecBacSi l
            JOIN NhanVien n ON l.MaBacSi = n.MaNV
            JOIN PhongKham p ON l.MaPhong = p.MaPhong
            WHERE l.MaLich = ?
        `;
        const [rows] = await db.execute(query, [maLich]);
        return rows.length > 0 ? rows[0] : null;
    },

    // Get all schedules for a doctor
    getSchedulesByDoctor: async (maBacSi) => {
        const query = `
            SELECT
                l.MaLich,
                l.MaBacSi,
                n.HoTen as TenBacSi,
                l.MaPhong,
                p.TenPhong,
                l.NgayLam,
                l.GioBatDau,
                l.GioKetThuc
            FROM LichLamViecBacSi l
            JOIN NhanVien n ON l.MaBacSi = n.MaNV
            JOIN PhongKham p ON l.MaPhong = p.MaPhong
            WHERE l.MaBacSi = ?
            ORDER BY l.NgayLam ASC, l.GioBatDau ASC
        `;
        const [rows] = await db.execute(query, [maBacSi]);
        return rows;
    },

    // Delete schedule
    deleteSchedule: async (maLich) => {
        const query = `DELETE FROM LichLamViecBacSi WHERE MaLich = ?`;
        const [result] = await db.execute(query, [maLich]);
        return result;
    },

    // Get filtered schedules by specialty, doctor, date range
    getFilteredSchedules: async (maChuyenKhoa, maBacSi, dateFrom, dateTo) => {
        let sql = `
            SELECT
                l.MaLich,
                l.MaBacSi,
                n.HoTen as TenBacSi,
                n.MaChuyenKhoa,
                c.TenChuyenKhoa,
                l.MaPhong,
                p.TenPhong,
                l.NgayLam,
                l.GioBatDau,
                l.GioKetThuc
            FROM LichLamViecBacSi l
            JOIN NhanVien n ON l.MaBacSi = n.MaNV
            JOIN ChuyenKhoa c ON n.MaChuyenKhoa = c.MaChuyenKhoa
            JOIN PhongKham p ON l.MaPhong = p.MaPhong
            WHERE n.MaVaiTro = (SELECT MaVaiTro FROM VaiTro WHERE TenVaiTro = 'Bac Si')
        `;
        const params = [];

        if (maChuyenKhoa) {
            sql += ' AND c.MaChuyenKhoa = ?';
            params.push(maChuyenKhoa);
        }
        if (maBacSi) {
            sql += ' AND l.MaBacSi = ?';
            params.push(maBacSi);
        }
        if (dateFrom) {
            sql += ' AND l.NgayLam >= ?';
            params.push(dateFrom);
        }
        if (dateTo) {
            sql += ' AND l.NgayLam <= ?';
            params.push(dateTo);
        }

        sql += ' ORDER BY l.NgayLam ASC, l.GioBatDau ASC';

        const [rows] = await db.execute(sql, params);
        return rows;
    },

    // Get doctors by specialty and specific date (for appointment booking)
    getDoctorsBySpecialtyAndDate: async (maChuyenKhoa, ngayLam) => {
        const query = `
            SELECT DISTINCT
                n.MaNV,
                n.HoTen,
                n.MaChuyenKhoa,
                c.TenChuyenKhoa,
                l.NgayLam,
                l.GioBatDau,
                l.GioKetThuc
            FROM NhanVien n
            JOIN ChuyenKhoa c ON n.MaChuyenKhoa = c.MaChuyenKhoa
            JOIN LichLamViecBacSi l ON n.MaNV = l.MaBacSi
            WHERE n.MaChuyenKhoa = ?
            AND n.MaVaiTro = (SELECT MaVaiTro FROM VaiTro WHERE TenVaiTro = 'Bac Si')
            AND DATE(l.NgayLam) = DATE(?)
            ORDER BY n.HoTen ASC
        `;
        const [rows] = await db.execute(query, [maChuyenKhoa, ngayLam]);
        return rows;
    }
};

export default Schedule;
