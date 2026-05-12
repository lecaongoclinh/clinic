import SuppliersService from "../services/suppliersService.js";

const SuppliersController = {
    getAll: async (req, res) => {
        try {
            const data = await SuppliersService.getAllSuppliers(req.query);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy danh sách nhà cung cấp", error: err.message });
        }
    },

    getById: async (req, res) => {
        try {
            const data = await SuppliersService.getSupplierById(req.params.id);
            if (!data) return res.status(404).json({ message: "Không tìm thấy nhà cung cấp" });
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy nhà cung cấp", error: err.message });
        }
    },

    getMedicines: async (req, res) => {
        try {
            const data = await SuppliersService.getMedicinesBySupplier(req.params.id);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy thuốc theo nhà cung cấp", error: err.message });
        }
    },

    getImports: async (req, res) => {
        try {
            const data = await SuppliersService.getImportsBySupplier(req.params.id);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy lịch sử nhập", error: err.message });
        }
    },

    create: async (req, res) => {
        try {
            const result = await SuppliersService.createSupplier(req.body);
            res.status(201).json({ message: "Thêm nhà cung cấp thành công", data: result });
        } catch (err) {
            res.status(400).json({ message: err.message || "Lỗi thêm nhà cung cấp", error: err.message });
        }
    },

    update: async (req, res) => {
        try {
            const result = await SuppliersService.updateSupplier(req.params.id, req.body);
            res.json({ message: "Cập nhật nhà cung cấp thành công", data: result });
        } catch (err) {
            res.status(400).json({ message: err.message || "Lỗi cập nhật nhà cung cấp", error: err.message });
        }
    },

    delete: async (req, res) => {
        try {
            const result = await SuppliersService.deleteSupplier(req.params.id);
            res.json({
                message: result?.softDeleted
                    ? "Nhà cung cấp đã phát sinh dữ liệu, đã chuyển sang ngừng hợp tác"
                    : "Xóa nhà cung cấp thành công",
                data: result
            });
        } catch (err) {
            res.status(err.statusCode || 500).json({
                message: err.message || "Lỗi xóa nhà cung cấp",
                error: err.message
            });
        }
    }
};

export default SuppliersController;
