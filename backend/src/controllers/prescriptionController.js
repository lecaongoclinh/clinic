import PrescriptionService from "../services/prescriptionService.js";

const PrescriptionController = {

    getAll: async (req, res) => {
        try {
            const data = await PrescriptionService.getAll();
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getDetail: async (req, res) => {
        try {
            const { id } = req.params;

            const data = await PrescriptionService.getDetail(id);

            res.json(data);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

};

export default PrescriptionController;