import db from '../config/db.js';

const specialtyModel = {
    getAll: async () => {
        try {
            const [rows] = await db.execute("SELECT MaChuyenKhoa, TenChuyenKhoa FROM ChuyenKhoa");
            return rows;
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}
 export default specialtyModel;