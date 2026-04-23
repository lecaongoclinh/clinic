import db from "../config/db.js";

const KhoModel = {

    getAll: async () => {
        const [rows] = await db.query("SELECT * FROM Kho");
        return rows;
    }

};

export default KhoModel;