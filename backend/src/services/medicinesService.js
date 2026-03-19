import MedicinesModel from "../models/medicinesModel.js";

const MedicinesService = {

    getAllMedicines: async () => {
        return await MedicinesModel.getAll();
    },

    getMedicineById: async (id) => {
        return await MedicinesModel.getById(id);
    },

    createMedicine: async (data) => {
        return await MedicinesModel.create(data);
    },

    updateMedicine: async (id, data) => {
        return await MedicinesModel.update(id, data);
    },

    deleteMedicine: async (id) => {
        return await MedicinesModel.delete(id);
    },

    getLowStock: async () => {
        return await MedicinesModel.lowStock();
    },

    // ================= NEW =================
     getMedicinesBySupplier: async (MaNCC) => {
        if (!MaNCC) throw new Error("Thiếu MaNCC");
        return await MedicinesModel.getBySupplier(MaNCC);
    }

};

export default MedicinesService;