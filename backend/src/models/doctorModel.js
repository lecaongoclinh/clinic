import db from '../config/db.js';

const Doctor = {
    getDoctorBySpecialty: async (maChuyenKhoa) => {
        const query = `
        SELECT MaNV, HoTen 
            FROM NhanVien 
            WHERE MaChuyenKhoa = ? 
            AND MaVaiTro = (SELECT MaVaiTro FROM VaiTro WHERE TenVaiTro = 'Bac Si')
            AND TrangThai = TRUE
        `;
        const [rows] = await db.execute(query, [maChuyenKhoa]);
        return rows;
    }
}

export default Doctor;