import db from '../config/db.js';

const Patient = {
    // Tìm kiếm bệnh nhân theo tên
    searchByName: async (tenBN) => {
        const query = `
            SELECT MaBN, HoTen, SoDienThoai, DiaChi, NgaySinh
            FROM BenhNhan
            WHERE HoTen LIKE ?
            LIMIT 10
        `;
        const [rows] = await db.execute(query, [`%${tenBN}%`]);
        return rows;
    },

    // Lấy chi tiết bệnh nhân
    getById: async (maBN) => {
        const query = `
            SELECT MaBN, HoTen, SoDienThoai, DiaChi, NgaySinh
            FROM BenhNhan
            WHERE MaBN = ?
        `;
        const [rows] = await db.execute(query, [maBN]);
        return rows[0];
    },

    // Tạo bệnh nhân mới
    create: async (hoTen, soDienThoai, diaChi, ngaySinh) => {
        const query = `
            INSERT INTO BenhNhan (HoTen, SoDienThoai, DiaChi, NgaySinh)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await db.execute(query, [hoTen, soDienThoai, diaChi, ngaySinh]);
        return result.insertId;
    }
};

export default Patient;
