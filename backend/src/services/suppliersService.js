import SuppliersModel from "../models/suppliersModel.js";

const SuppliersService = {

    getAllSuppliers: async () => {
        return await SuppliersModel.getAll();
    },

    getSupplierById: async (id) => {
        return await SuppliersModel.getById(id);
    },

    // 🔥 NEW
    getMedicinesBySupplier: async (MaNCC) => {
        return await SuppliersModel.getMedicinesBySupplier(MaNCC);
    },

    createSupplier: async (data) => {
        return await SuppliersModel.create(data);
    },

    updateSupplier: async (id, data) => {
        return await SuppliersModel.update(id, data);
    },

    deleteSupplier: async (id) => {
        return await SuppliersModel.delete(id);
    },
    getImportsBySupplier: async (MaNCC) => {
    return await SuppliersModel.getImportsBySupplier(MaNCC);
}

};

export default SuppliersService;