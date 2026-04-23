import PrescriptionModel from "../models/prescriptionModel.js";

const PrescriptionService = {

    getAll: async () => {
        return await PrescriptionModel.getAll();
    },

    getDetail: async (id) => {
        return await PrescriptionModel.getDetail(id);
    }

};

export default PrescriptionService;