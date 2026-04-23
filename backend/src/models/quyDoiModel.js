import db from "../config/db.js";

const QuyDoiModel = {

    getByMedicine: async (MaThuoc) => {
        const [rows] = await db.query(
            `SELECT TenDonVi, SoLuong
             FROM QuyDoiDonVi
             WHERE MaThuoc = ?
             ORDER BY SoLuong DESC`,
            [MaThuoc]
        );

        return rows;
    }

};

export default QuyDoiModel;