import BatchModel from "../models/batchModel.js";

const BatchService = {

    getAllBatches: async () => {
        return await BatchModel.getAll();
    },

    getBatchesByMedicine: async (MaThuoc) => {
        return await BatchModel.getByMedicine(MaThuoc);
    },

    getExpiredBatches: async () => {
        return await BatchModel.getExpired();
    },

    getNearExpiryBatches: async () => {
        return await BatchModel.getNearExpiry();
    }

};

export default BatchService;