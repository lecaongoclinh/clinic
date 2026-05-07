import PrescriptionModel from "../models/prescriptionModel.js";

const PrescriptionService = {

    getAll: async (filters = {}) => {
        return await PrescriptionModel.getAll(filters);
    },

    getDetail: async (id) => {
        return await PrescriptionModel.getDetail(id);
    },

    create: async (maPK, items) => {
        if (!maPK || !items || items.length === 0) {
            throw new Error('Dữ liệu không hợp lệ. Cần có mã phiếu khám và danh sách thuốc.');
        }
        return await PrescriptionModel.create(maPK, items);
    }

};

export default PrescriptionService;
