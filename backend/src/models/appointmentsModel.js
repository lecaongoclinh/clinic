import db from '../config/db.js';

const Appointment = {
    // Lấy danh sách lịch khám
    getAppointments: async (tenBN, maChuyenKhoa, maBacSi) => {
        let query = `
            SELECT 
                lk.MaLK as id,
                lk.MaBN,
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
    // Tạo lịch khám mới
    createAppointment: async (maBN, maBacSi, ngayHen, gioHen, lyDoKham) => {
        const query = `
            INSERT INTO LichKham (MaBN, MaBacSi, NgayHen, GioHen, LyDoKham)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(query, [maBN, maBacSi, ngayHen, gioHen, lyDoKham]);
        return result.insertId;
    },

    // Cập nhật lịch khám
    updateAppointment: async (maLK, maBN, maBacSi, ngayHen, gioHen, lyDoKham, trangThai) => {
        const query = `
            UPDATE LichKham
            SET MaBN = ?, MaBacSi = ?, NgayHen = ?, GioHen = ?, LyDoKham = ?, TrangThai = ?
            WHERE MaLK = ?
        `;
        const [result] = await db.execute(query, [maBN, maBacSi, ngayHen, gioHen, lyDoKham, trangThai, maLK]);
        return result.affectedRows > 0;
    },

    // Xóa lịch khám
    deleteAppointment: async (maLK) => {
        const query = `DELETE FROM LichKham WHERE MaLK = ?`;
        const [result] = await db.execute(query, [maLK]);
        return result.affectedRows > 0;
    }
}
export default Appointment;