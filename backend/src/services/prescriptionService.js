import PrescriptionModel from "../models/prescriptionModel.js";

const PrescriptionService = {

    getAll: async (filters = {}) => {
        return await PrescriptionModel.getAll(filters);
    },

    getDetail: async (id) => {
        return await PrescriptionModel.getDetail(id);
    }

};

export default PrescriptionService;
