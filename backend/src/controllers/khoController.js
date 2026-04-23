import KhoService from "../services/khoService.js";

const KhoController = {

    getAll: async (req, res) => {
        try {
            const data = await KhoService.getAll();
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

};

export default KhoController;