import SuppliersModel from "../models/suppliersModel.js";

const SuppliersService = {

    getAllSuppliers: async () => {
        return await SuppliersModel.getAll();
    },

    getSupplierById: async (id) => {
        return await SuppliersModel.getById(id);
    },

    createSupplier: async (data) => {
        // Có thể validate ở đây nếu cần
        return await SuppliersModel.create(data);
    },

    updateSupplier: async (id, data) => {
        return await SuppliersModel.update(id, data);
    },

    deleteSupplier: async (id) => {
        return await SuppliersModel.delete(id);
    }

};

export default SuppliersService;