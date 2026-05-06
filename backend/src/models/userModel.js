import db from '../config/db.js';

const NhanVien = {
  findByUsername: async (username) => {
    const [rows] = await db.query('SELECT * FROM NhanVien WHERE Username = ?', [username]);
    return rows[0];
  },
  findByEmail: async (email) => {
    const [rows] = await db.query('SELECT * FROM NhanVien WHERE Email = ?', [email]);
    return rows[0];
  },
  findByPhone: async (soDienThoai) => {
    const [rows] = await db.query('SELECT * FROM NhanVien WHERE SoDienThoai = ?', [soDienThoai]);
    return rows[0];
  },
  roleExists: async (maVaiTro) => {
    const [rows] = await db.query('SELECT MaVaiTro FROM VaiTro WHERE MaVaiTro = ?', [maVaiTro]);
    return rows.length > 0;
  },
  specialtyExists: async (maChuyenKhoa) => {
    const [rows] = await db.query('SELECT MaChuyenKhoa FROM ChuyenKhoa WHERE MaChuyenKhoa = ?', [maChuyenKhoa]);
    return rows.length > 0;
  },
  create: async (userData) => {
    const { HoTen, SoDienThoai, Email, Username, Password, MaVaiTro, MaChuyenKhoa } = userData;
    const [result] = await db.query(
      `INSERT INTO NhanVien
        (HoTen, SoDienThoai, Email, Username, Password, MaVaiTro, MaChuyenKhoa)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [HoTen, SoDienThoai, Email, Username, Password, MaVaiTro, MaChuyenKhoa]
    );
    return result.insertId;
  }
};
export default NhanVien;
