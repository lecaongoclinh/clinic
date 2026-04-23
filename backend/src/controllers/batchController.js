import BatchService from "../services/batchService.js";

const BatchController = {

    getAll: async (req, res) => {
        try {
            const data = await BatchService.getAllBatches();
            res.json(data);
        } catch (err) {
            res.status(500).json({
                message: "Lỗi lấy danh sách lô thuốc",
                error: err.message
            });
        }
    },

getByMedicine: async (req, res) => {
    try {
        const { MaThuoc } = req.params; // ✅ FIX

        const data = await BatchService.getBatchesByMedicine(MaThuoc);

        res.json(data);
    } catch (err) {
        res.status(500).json({
            message: "Lỗi lấy lô theo thuốc",
            error: err.message
        });
    }
},

    getExpired: async (req, res) => {
        try {
            const data = await BatchService.getExpiredBatches();
            res.json({
                message: "Danh sách thuốc hết hạn",
                data
            });
        } catch (err) {
            res.status(500).json({
                message: "Lỗi kiểm tra hạn",
                error: err.message
            });
        }
    },

    getNearExpiry: async (req, res) => {
        try {
            const data = await BatchService.getNearExpiryBatches();
            res.json({
                message: "Danh sách thuốc sắp hết hạn",
                data
            });
        } catch (err) {
            res.status(500).json({
                message: "Lỗi kiểm tra sắp hết hạn",
                error: err.message
            });
        }
    },
    getById: async (req, res) => {
    try {
        const data = await BatchService.getById(req.params.id);
        res.json(data);
    } catch (err) {
        res.status(500).json({
            message: "Lỗi lấy chi tiết lô",
            error: err.message
        });
    }
},

// UPDATE
update: async (req, res) => {
    try {
        await BatchService.update(req.params.id, req.body);
        res.json({ message: "Cập nhật thành công" });
    } catch (err) {
        res.status(500).json({
            message: "Lỗi cập nhật",
            error: err.message
        });
    }
},

// DELETE (HỦY)
delete: async (req, res) => {
    try {
        await BatchService.delete(req.params.id);
        res.json({ message: "Đã hủy thuốc" });
    } catch (err) {
        res.status(500).json({
            message: "Lỗi hủy thuốc",
            error: err.message
        });
    }
},

// CHUYỂN KHO
transfer: async (req, res) => {
    try {
        const { MaLo, MaKhoMoi } = req.body;

        await BatchService.transfer(MaLo, MaKhoMoi);

        res.json({ message: "Chuyển kho thành công" });
    } catch (err) {
        res.status(500).json({
            message: "Lỗi chuyển kho",
            error: err.message
        });
    }
}

};

// ===== INVENTORY =====

// CHI TIẾT

export default BatchController;