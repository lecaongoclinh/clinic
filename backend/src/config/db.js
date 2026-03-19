import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
// Helper function để lấy số thứ tự tiếp theo
export const getNextQueueNumber = async (connection) => {
    const today = new Date().toISOString().split('T')[0];
    
    const [result] = await connection.query(
        `SELECT COUNT(*) as count FROM PhieuKham 
         WHERE DATE(NgayKham) = ? AND LoaiKham = 'walk-in'`,
        [today]
    );

    return result[0].count + 1;
};

// Helper function để đếm số lượng đang chờ
export const getWaitingCount = async (connection) => {
    const [result] = await connection.query(
        `SELECT COUNT(*) as count FROM PhieuKham 
         WHERE TrangThai = 'dang-cho' AND DATE(NgayKham) = CURDATE()`
    );
    return result[0].count;
};

// Đoạn code kiểm tra kết nối
try {
  const connection = await pool.getConnection();
  console.log('Kết nối MySQL thành công! ID:', connection.threadId);
  connection.release(); 
} catch (error) {
  console.error('Kết nối MySQL thất bại:', error.message);
}
// Xuất mặc định pool này
export default pool;