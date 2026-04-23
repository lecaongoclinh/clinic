import SuppliersService from "../services/suppliersService.js";

const SuppliersController = {

    getAll: async (req, res) => {
        try {
            const data = await SuppliersService.getAllSuppliers();
            res.json(data);
        } catch (err) {
            res.status(500).json({
                message: "Lỗi lấy danh sách nhà cung cấp",
                error: err.message
            });
        }
    },

    getById: async (req, res) => {
        try {
            const { id } = req.params;
            const data = await SuppliersService.getSupplierById(id);

            if (!data) {
                return res.status(404).json({
                    message: "Không tìm thấy nhà cung cấp"
                });
            }

            res.json(data);
        } catch (err) {
            res.status(500).json({
                message: "Lỗi lấy nhà cung cấp",
                error: err.message
            });
        }
    },

    // 🔥 NEW: lấy thuốc theo NCC
    getMedicines: async (req, res) => {
        try {
            const { id } = req.params;

            const data = await SuppliersService.getMedicinesBySupplier(id);

            res.json(data);

        } catch (err) {
            res.status(500).json({
                message: "Lỗi lấy thuốc theo nhà cung cấp",
                error: err.message
            });
        }
    },

    create: async (req, res) => {
        try {
            const { TenNCC, DiaChi, SoDienThoai } = req.body;

            if (!TenNCC || !DiaChi || !SoDienThoai) {
                return res.status(400).json({
                    message: "Thiếu dữ liệu (TenNCC, DiaChi, SoDienThoai)"
                });
            }

            const result = await SuppliersService.createSupplier(req.body);

            res.status(201).json({
                message: "Thêm nhà cung cấp thành công",
                data: result
            });

        } catch (err) {
            res.status(500).json({
                message: "Lỗi thêm nhà cung cấp",
                error: err.message
            });
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { TenNCC, DiaChi, SoDienThoai } = req.body;

            if (!TenNCC || !DiaChi || !SoDienThoai) {
                return res.status(400).json({
                    message: "Thiếu dữ liệu cập nhật"
                });
            }

            const result = await SuppliersService.updateSupplier(id, req.body);

            res.json({
                message: "Cập nhật nhà cung cấp thành công",
                data: result
            });

        } catch (err) {
            res.status(500).json({
                message: "Lỗi cập nhật nhà cung cấp",
                error: err.message
            });
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;

            const result = await SuppliersService.deleteSupplier(id);

            res.json({
                message: "Xóa nhà cung cấp thành công",
                data: result
            });

        } catch (err) {
            res.status(500).json({
                message: "Lỗi xóa nhà cung cấp",
                error: err.message
            });
        }
    },
    getImports: async (req, res) => {
    try {
        const { id } = req.params;
        const data = await SuppliersService.getImportsBySupplier(id);
        res.json(data);
    } catch (err) {
        res.status(500).json({
            message: "Lỗi lấy lịch sử nhập",
            error: err.message
        });
    }
}

};

export default SuppliersController;