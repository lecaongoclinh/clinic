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
    }

};

export default BatchController;