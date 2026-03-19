import db from '../config/db.js';

const Schedule = {
    // Create a new doctor schedule
    createSchedule: async (maBacSi, maPhong, ngayLam, gioBatDau, gioKetThuc) => {
        const query = `
            INSERT INTO LichLamViecBacSi (MaBacSi, MaPhong, NgayLam, GioBatDau, GioKetThuc)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(query, [maBacSi, maPhong, ngayLam, gioBatDau, gioKetThuc]);
        return result;
    },

    // Check if doctor exists
    checkDoctorExists: async (maBacSi) => {
        const query = `
            SELECT MaNV, HoTen, MaVaiTro
            FROM NhanVien
            WHERE MaNV = ? AND MaVaiTro = (SELECT MaVaiTro FROM VaiTro WHERE TenVaiTro = 'Bac Si')
        `;
        const [rows] = await db.execute(query, [maBacSi]);
        return rows.length > 0 ? rows[0] : null;
    },

    // Check if room exists
    checkRoomExists: async (maPhong) => {
        const query = `SELECT MaPhong, TenPhong FROM PhongKham WHERE MaPhong = ?`;
        const [rows] = await db.execute(query, [maPhong]);
        return rows.length > 0 ? rows[0] : null;
    },

    // Check for overlapping schedules
    checkScheduleConflict: async (maBacSi, ngayLam, gioBatDau, gioKetThuc) => {
        const query = `
            SELECT MaLich, GioBatDau, GioKetThuc
            FROM LichLamViecBacSi
            WHERE MaBacSi = ?
            AND NgayLam = ?
            AND (? < GioKetThuc AND ? > GioBatDau)
        `;
        const [rows] = await db.execute(query, [maBacSi, ngayLam, gioBatDau, gioKetThuc]);
        return rows.length > 0 ? rows : null;
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
    }
};

export default Schedule;
