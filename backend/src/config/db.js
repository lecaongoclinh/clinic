import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
// Đoạn code kiểm tra kết nối
try {
  const connection = await pool.getConnection();
  console.log('✅ Kết nối MySQL thành công! ID:', connection.threadId);
  connection.release(); // Trả lại kết nối vào pool
} catch (error) {
  console.error('❌ Kết nối MySQL thất bại:', error.message);
}
// Xuất mặc định pool này
export default pool;