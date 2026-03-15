import db from '../config/db.js';

const Appointment = {
    // Lấy danh sách lịch khám
    getAppointments: async (maChuyenKhoa, maBacSi) => {
        let query = `
            SELECT 
                lk.MaLK as id,
                bn.HoTen as title,
                CONCAT(lk.NgayHen, 'T', lk.GioHen) as start,
                lk.LyDoKham,
                nv.HoTen as TenBacSi,
                ck.TenChuyenKhoa
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

        const [rows] = await db.execute(query, params);
        return rows;
    }
}

export default Appointment;