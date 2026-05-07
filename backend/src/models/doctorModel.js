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
    },
    getAllDoctors: async () => {
        const query = `
        SELECT nv.MaNV, nv.HoTen, nv.MaChuyenKhoa, ck.TenChuyenKhoa
            FROM NhanVien nv
            LEFT JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
            WHERE nv.MaVaiTro = (SELECT MaVaiTro FROM VaiTro WHERE TenVaiTro = 'Bac Si')
            AND nv.TrangThai = TRUE
        `;
        const [rows] = await db.execute(query);
        return rows;
    }
}

export default Doctor;
