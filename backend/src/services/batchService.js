import BatchModel from "../models/batchModel.js";

const BatchService = {
    getAllBatches: async () => BatchModel.getAll(),
    getBatchesByMedicine: async (MaThuoc, filters = {}) => BatchModel.getByMedicine(MaThuoc, filters),
    getExpiredBatches: async () => BatchModel.getExpired(),
    getNearExpiryBatches: async () => BatchModel.getNearExpiry(),
    getById: async (id) => BatchModel.getById(id),

    update: async (id, data) => {
        const current = await BatchModel.getById(id);
        if (!current) throw new Error("Không tìm thấy lô thuốc");
        if (Number(current.SoLuongDaXuat || 0) > 0 && data.HanSuDung) {
            throw new Error("Không cho sửa hạn dùng trực tiếp khi lô đã phát sinh xuất");
        }
        return BatchModel.update(id, data);
    },

    delete: async (id) => BatchModel.delete(id),
    transfer: async (MaLo, MaKhoMoi) => BatchModel.transfer(MaLo, MaKhoMoi)
};

export default BatchService;
