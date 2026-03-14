import User from '../models/userModel.js';
import { hash, compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userService = {
  register: async (userData) => {
    const hashedPassword = await hash(userData.Password, 10);
    return await User.create({ ...userData, Password: hashedPassword });
  },
  login: async (username, password) => {
    const user = await User.findByUsername(username);
    if (!user) throw new Error('Người dùng không tồn tại');

    const isMatch = await compare(password, user.Password);
    if (!isMatch) throw new Error('Mật khẩu không chính xác');

    const token = jwt.sign(
        { id: user.MaNV, role: user.MaVaiTro },
        process.env.JWT_SECRET, // Lấy từ file .env
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } // Thời gian hết hạn token
    );
    return { token, user: { id: user.MaNV, name: user.HoTen, role: user.MaVaiTro } };
  }
};

export default userService;