import MedicinesService from "../services/medicinesService.js";

const MedicinesController = {
    getAll: async (req, res) => {
        try {
            const data = await MedicinesService.getAllMedicines(req.query);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy danh sách thuốc", error: err.message });
        }
    },

    getById: async (req, res) => {
        try {
            const data = await MedicinesService.getMedicineById(req.params.id);
            if (!data) return res.status(404).json({ message: "Không tìm thấy thuốc" });
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy thuốc", error: err.message });
        }
    },

    create: async (req, res) => {
        try {
            const result = await MedicinesService.createMedicine(req.body);
            res.status(201).json({ message: "Thêm thuốc thành công", data: result });
        } catch (err) {
            res.status(400).json({ message: err.message || "Lỗi thêm thuốc", error: err.message });
        }
    },

    update: async (req, res) => {
        try {
            const result = await MedicinesService.updateMedicine(req.params.id, req.body);
            res.json({ message: "Cập nhật thuốc thành công", data: result });
        } catch (err) {
            res.status(400).json({ message: err.message || "Lỗi cập nhật thuốc", error: err.message });
        }
    },

    delete: async (req, res) => {
        try {
            const result = await MedicinesService.deleteMedicine(req.params.id);
            res.json({
                message: result?.softDeleted
                    ? "Thuốc đã phát sinh dữ liệu, đã chuyển sang ngừng kinh doanh"
                    : "Xóa thuốc thành công",
                data: result
            });
        } catch (err) {
            res.status(500).json({ message: "Lỗi xóa thuốc", error: err.message });
        }
    },

    lowStock: async (_req, res) => {
        try {
            const data = await MedicinesService.getLowStock();
            res.json({ message: "Danh sách thuốc sắp hết", data });
        } catch (err) {
            res.status(500).json({ message: "Lỗi kiểm tra tồn kho", error: err.message });
        }
    },

    getBySupplier: async (req, res) => {
        try {
            const { MaNCC, MaKho } = req.query;
            if (!MaNCC) return res.status(400).json({ message: "Thiếu MaNCC" });
            const data = await MedicinesService.getMedicinesBySupplier({ MaNCC, MaKho });
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy thuốc theo nhà cung cấp", error: err.message });
        }
    }
};

export default MedicinesController;
