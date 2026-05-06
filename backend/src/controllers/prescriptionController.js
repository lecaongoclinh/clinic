import PrescriptionService from "../services/prescriptionService.js";

const PrescriptionController = {

    getAll: async (req, res) => {
        try {
            const data = await PrescriptionService.getAll({
                maChuyenKhoa: req.query.maChuyenKhoa || '',
                maBacSi: req.query.maBacSi || '',
                patient: req.query.patient || '',
                trangThai: req.query.trangThai || ''
            });
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
    },

    create: async (req, res) => {
        try {
            const { maPK, medicines } = req.body;
            if (!maPK || !medicines || !medicines.length) {
                return res.status(400).json({ success: false, message: 'Thiếu dữ liệu kê đơn' });
            }

            const maDT = await PrescriptionService.create(maPK, medicines);
            res.status(201).json({ success: true, message: 'Kê đơn thuốc thành công', maDT });
        } catch (err) {
            console.error('Lỗi create prescription:', err);
            res.status(500).json({ success: false, message: err.message || 'Lỗi server' });
        }
    }

};

export default PrescriptionController;
