import BatchService from "../services/batchService.js";

const BatchController = {
    getAll: async (_req, res) => {
        try {
            const data = await BatchService.getAllBatches();
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy danh sách lô thuốc", error: err.message });
        }
    },

    getByMedicine: async (req, res) => {
        try {
            const data = await BatchService.getBatchesByMedicine(req.params.MaThuoc || req.params.id, req.query);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy lô theo thuốc", error: err.message });
        }
    },

    getExpired: async (_req, res) => {
        try {
            const data = await BatchService.getExpiredBatches();
            res.json({ message: "Danh sách thuốc hết hạn", data });
        } catch (err) {
            res.status(500).json({ message: "Lỗi kiểm tra hạn", error: err.message });
        }
    },

    getNearExpiry: async (_req, res) => {
        try {
            const data = await BatchService.getNearExpiryBatches();
            res.json({ message: "Danh sách thuốc sắp hết hạn", data });
        } catch (err) {
            res.status(500).json({ message: "Lỗi kiểm tra sắp hết hạn", error: err.message });
        }
    },

    getById: async (req, res) => {
        try {
            const data = await BatchService.getById(req.params.id);
            if (!data) return res.status(404).json({ message: "Không tìm thấy lô thuốc" });
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy chi tiết lô", error: err.message });
        }
    },

    update: async (req, res) => {
        try {
            await BatchService.update(req.params.id, req.body);
            res.json({ message: "Cập nhật thành công" });
        } catch (err) {
            res.status(400).json({ message: err.message || "Lỗi cập nhật", error: err.message });
        }
    },

    delete: async (req, res) => {
        try {
            await BatchService.delete(req.params.id);
            res.json({ message: "Đã hủy lô thuốc" });
        } catch (err) {
            res.status(500).json({ message: "Lỗi hủy lô thuốc", error: err.message });
        }
    },

    transfer: async (req, res) => {
        try {
            const { MaLo, MaKhoMoi } = req.body;
            await BatchService.transfer(MaLo, MaKhoMoi);
            res.json({ message: "Chuyển kho thành công" });
        } catch (err) {
            res.status(500).json({ message: "Lỗi chuyển kho", error: err.message });
        }
    }
};

export default BatchController;
