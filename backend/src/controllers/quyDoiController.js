import QuyDoiService from "../services/quyDoiService.js";

const QuyDoiController = {

    getByMedicine: async (req, res) => {
        try {
            const { MaThuoc } = req.query;

            if (!MaThuoc) {
                return res.status(400).json({ message: "Thiếu MaThuoc" });
            }

            const data = await QuyDoiService.getByMedicine(MaThuoc);
            res.json(data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

};

export default QuyDoiController;