import db from '../config/db.js';

const Appointment = {
    // Lấy danh sách lịch khám
    getAppointments: async (tenBN, maChuyenKhoa, maBacSi) => {
        let query = `
            SELECT 
                lk.MaLK as id,
                lk.MaBN,
                lk.MaBacSi,
                lk.MaLich,
                bn.HoTen as title,
                CONCAT(lk.NgayHen, 'T', lk.GioHen) as start,
                lk.LyDoKham,
                nv.HoTen as TenBacSi,
                ck.TenChuyenKhoa,
                lk.TrangThai
            FROM LichKham lk
            JOIN BenhNhan bn ON lk.MaBN = bn.MaBN
            JOIN NhanVien nv ON lk.MaBacSi = nv.MaNV
            LEFT JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
            WHERE 1=1
        `;
        
        const params = [];
        if (maChuyenKhoa) {
            query += " AND nv.MaChuyenKhoa = ?";
            params.push(maChuyenKhoa);
        }
        if (maBacSi) {
            query += " AND lk.MaBacSi = ?";
            params.push(maBacSi);
        }
        // 🔥 Tìm kiếm theo tên bệnh nhân (không phân biệt hoa thường)
        if (tenBN && tenBN.trim() !== "") {
            query += " AND LOWER(bn.HoTen) LIKE LOWER(?)";
            params.push(`%${tenBN.trim()}%`);
        }
        const [rows] = await db.execute(query, params);
        return rows;
    },

    // Kiểm tra bác sĩ có lịch làm việc tại thời điểm hẹn không
    getDoctorWorkingSchedule: async (maBacSi, ngayHen, gioHen) => {
        const query = `
            SELECT MaLich, MaBacSi, MaPhong, NgayLam, GioBatDau, GioKetThuc
            FROM LichLamViecBacSi
            WHERE MaBacSi = ?
            AND DATE(NgayLam) = DATE(?)
            AND ? >= GioBatDau
            AND ? < GioKetThuc
            ORDER BY GioBatDau ASC
            LIMIT 1
        `;
        const [rows] = await db.execute(query, [maBacSi, ngayHen, gioHen, gioHen]);
        return rows.length > 0 ? rows[0] : null;
    },

    // Tạo lịch khám mới
    createAppointment: async (maBN, maBacSi, ngayHen, gioHen, lyDoKham, maLich) => {
        const query = `
            INSERT INTO LichKham (MaBN, MaBacSi, MaLich, NgayHen, GioHen, LyDoKham)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(query, [maBN, maBacSi, maLich, ngayHen, gioHen, lyDoKham]);
        return result.insertId;
    },

    // Cập nhật lịch khám
    updateAppointment: async (maLK, maBN, maBacSi, ngayHen, gioHen, lyDoKham, trangThai, maLich) => {
        const query = `
            UPDATE LichKham
            SET MaBN = ?, MaBacSi = ?, MaLich = ?, NgayHen = ?, GioHen = ?, LyDoKham = ?, TrangThai = ?
            WHERE MaLK = ?
        `;
        const [result] = await db.execute(query, [maBN, maBacSi, maLich, ngayHen, gioHen, lyDoKham, trangThai, maLK]);
        return result.affectedRows > 0;
    },

    // Xóa lịch khám
    deleteAppointment: async (maLK) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute(`UPDATE PhieuKham SET MaLK = NULL WHERE MaLK = ?`, [maLK]);
            const [result] = await connection.execute(`DELETE FROM LichKham WHERE MaLK = ?`, [maLK]);
            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}
export default Appointment;
