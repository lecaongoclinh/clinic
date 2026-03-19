import BatchModel from "../models/batchModel.js";

const BatchService = {

    getAllBatches: async () => {
        return await BatchModel.getAll();
    },

    getExpiredBatches: async () => {
        return await BatchModel.getExpired();
    }

};

export default BatchService;