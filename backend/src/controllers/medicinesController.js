import MedicinesService from "../services/medicinesService.js";

const MedicinesController = {

    getAll: async (req, res) => {
        try {
            const data = await MedicinesService.getAllMedicines();
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy danh sách thuốc", error: err.message });
        }
    },

    getById: async (req, res) => {
        try {
            const { id } = req.params;
            const data = await MedicinesService.getMedicineById(id);

            if (!data) {
                return res.status(404).json({ message: "Không tìm thấy thuốc" });
            }

            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy thuốc", error: err.message });
        }
    },

    create: async (req, res) => {
        try {
            const { TenThuoc, DonViTinh, GiaBan } = req.body;

            if (!TenThuoc || !DonViTinh || !GiaBan) {
                return res.status(400).json({
                    message: "Thiếu dữ liệu (TenThuoc, DonViTinh, GiaBan)"
                });
            }

            const result = await MedicinesService.createMedicine(req.body);

            res.status(201).json({
                message: "Thêm thuốc thành công",
                data: result
            });

        } catch (err) {
            res.status(500).json({ message: "Lỗi thêm thuốc", error: err.message });
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { TenThuoc, DonViTinh, GiaBan } = req.body;

            if (!TenThuoc || !DonViTinh || !GiaBan) {
                return res.status(400).json({
                    message: "Thiếu dữ liệu cập nhật"
                });
            }

            const result = await MedicinesService.updateMedicine(id, req.body);

            res.json({
                message: "Cập nhật thuốc thành công",
                data: result
            });

        } catch (err) {
            res.status(500).json({ message: "Lỗi cập nhật thuốc", error: err.message });
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;

            const result = await MedicinesService.deleteMedicine(id);

            res.json({
                message: "Xóa thuốc thành công",
                data: result
            });

        } catch (err) {
            res.status(500).json({ message: "Lỗi xóa thuốc", error: err.message });
        }
    },

    lowStock: async (req, res) => {
        try {
            const data = await MedicinesService.getLowStock();

            res.json({
                message: "Danh sách thuốc sắp hết",
                data: data
            });

        } catch (err) {
            res.status(500).json({ message: "Lỗi kiểm tra tồn kho", error: err.message });
        }
    },

    
    getBySupplier: async (req, res) => {
        try {
            const { MaNCC } = req.query;

            if (!MaNCC) {
                return res.status(400).json({
                    message: "Thiếu MaNCC"
                });
            }

            const data = await MedicinesService.getBySupplier(MaNCC);

            res.json(data);

        } catch (err) {
            res.status(500).json({
                message: "Lỗi lấy thuốc theo nhà cung cấp",
                error: err.message
            });
        }
    }

};

export default MedicinesController;