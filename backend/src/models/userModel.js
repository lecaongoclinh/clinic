import db from '../config/db.js';

const NhanVien = {
  findByUsername: async (username) => {
    const [rows] = await db.query('SELECT * FROM NhanVien WHERE Username = ?', [username]);
    return rows[0];
  },
  create: async (userData) => {
    const { HoTen, Username, Password, MaVaiTro } = userData;
    const [result] = await db.query(
      'INSERT INTO NhanVien (HoTen, Username, Password, MaVaiTro) VALUES (?, ?, ?, ?)',
      [HoTen, Username, Password, MaVaiTro]
    );
    return result.insertId;
  }
};
export default NhanVien;