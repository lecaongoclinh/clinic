import KhoModel from "../models/khoModel.js";

const KhoService = {
    getAll: async () => await KhoModel.getAll()
};

export default KhoService;