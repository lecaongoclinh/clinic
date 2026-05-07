import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

try {
    // Kiểm tra xem bác sĩ 'bacsi' đã tồn tại chưa
    const [[existing]] = await conn.query(`
        SELECT MaNV FROM NhanVien WHERE Username = 'bacsi'
    `);

    if (existing) {
        console.log('Bác sĩ với username bacsi đã tồn tại, MaNV:', existing.MaNV);
    } else {
        // Thêm bác sĩ mới
        const [result] = await conn.query(`
            INSERT INTO NhanVien (HoTen, SoDienThoai, Email, Username, Password, MaVaiTro, MaChuyenKhoa, TrangThai)
            VALUES ('Bac Si Demo', '0900000002', 'bacsi@gmail.com', 'bacsi', '$2b$10$FoB9qytMFQsLeR7XSRDKtef5ssOJ6pw6zNpEmFM0zdWo0NWaQrSG2', 2, 1, 1)
        `);
        console.log('Đã thêm bác sĩ bacsi, MaNV:', result.insertId);
    }
} finally {
    await conn.end();
}