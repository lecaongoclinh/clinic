import User from '../models/userModel.js';
import { hash, compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';

const normalizeRegisterData = (userData) => ({
  HoTen: String(userData.hoTen ?? userData.HoTen ?? '').trim(),
  SoDienThoai: String(userData.soDienThoai ?? userData.SoDienThoai ?? '').trim(),
  Email: String(userData.email ?? userData.Email ?? '').trim(),
  Username: String(userData.username ?? userData.Username ?? '').trim(),
  Password: String(userData.password ?? userData.Password ?? ''),
  MaVaiTro: Number(userData.maVaiTro ?? userData.MaVaiTro),
  MaChuyenKhoa: userData.maChuyenKhoa ?? userData.MaChuyenKhoa ?? null
});

const userService = {
  register: async (userData) => {
    const user = normalizeRegisterData(userData);
    user.MaChuyenKhoa = user.MaChuyenKhoa ? Number(user.MaChuyenKhoa) : null;

    if (!user.HoTen || !user.SoDienThoai || !user.Email || !user.Username || !user.Password || !user.MaVaiTro) {
      throw new Error('Vui long nhap day du thong tin bat buoc');
    }

    if (user.Password.length < 6) {
      throw new Error('Mat khau phai co it nhat 6 ky tu');
    }

    if (user.MaVaiTro === 2 && !user.MaChuyenKhoa) {
      throw new Error('Vui long chon chuyen khoa cho bac si');
    }

    if (user.MaVaiTro !== 2) {
      user.MaChuyenKhoa = null;
    }

    if (!(await User.roleExists(user.MaVaiTro))) {
      throw new Error('Vai tro khong hop le');
    }

    if (user.MaChuyenKhoa && !(await User.specialtyExists(user.MaChuyenKhoa))) {
      throw new Error('Chuyen khoa khong hop le');
    }

    if (await User.findByUsername(user.Username)) {
      throw new Error('Ten dang nhap da ton tai');
    }

    if (await User.findByEmail(user.Email)) {
      throw new Error('Email da ton tai');
    }

    if (await User.findByPhone(user.SoDienThoai)) {
      throw new Error('So dien thoai da ton tai');
    }

    const hashedPassword = await hash(user.Password, 10);
    return await User.create({ ...user, Password: hashedPassword });
  },
  login: async (username, password) => {
    const user = await User.findByUsername(username);
    if (!user) throw new Error('Người dùng không tồn tại');

    const isMatch = await compare(password, user.Password);
    if (!isMatch) throw new Error('Mật khẩu không chính xác');

    const token = jwt.sign(
        { id: user.MaNV, userName: user.Username, role: user.MaVaiTro },
        process.env.JWT_SECRET, // Lấy từ file .env
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } // Thời gian hết hạn token
    );
    return { token, user: { id: user.MaNV, userName: user.Username, role: user.MaVaiTro } };
  },
  getUserByUserName: async (username) => {
    return await User.findByUsername(username);
  }
};

export default userService;
