import ServicesService from "../services/servicesService.js";

const ServicesController = {
    getDashboard: async (req, res) => {
        try {
            const data = await ServicesService.getDashboard({
                keyword: req.query.keyword || "",
                loai: req.query.loai || "",
                trangThai: req.query.trangThai ?? "",
                giaTu: req.query.giaTu || "",
                giaDen: req.query.giaDen || "",
                maChuyenKhoa: req.query.maChuyenKhoa || "",
                canDatTruoc: req.query.canDatTruoc ?? "",
                canChiDinhBacSi: req.query.canChiDinhBacSi ?? ""
            });

            res.json(data);
        } catch (error) {
            console.error("getDashboard error:", error);
            res.status(500).json({ message: error.message || "Lỗi lấy dữ liệu dịch vụ" });
        }
    },

    getAll: async (req, res) => {
        try {
            const data = await ServicesService.getAll({
                keyword: req.query.keyword || "",
                loai: req.query.loai || "",
                trangThai: req.query.trangThai ?? "",
                giaTu: req.query.giaTu || "",
                giaDen: req.query.giaDen || "",
                maChuyenKhoa: req.query.maChuyenKhoa || "",
                canDatTruoc: req.query.canDatTruoc ?? "",
                canChiDinhBacSi: req.query.canChiDinhBacSi ?? ""
            });

            res.json(data);
        } catch (error) {
            console.error("getAll services error:", error);
            res.status(500).json({ message: error.message || "Lỗi lấy danh sách dịch vụ" });
        }
    },

    getById: async (req, res) => {
        try {
            const data = await ServicesService.getById(req.params.id);
            res.json(data);
        } catch (error) {
            console.error("getById service error:", error);
            res.status(404).json({ message: error.message || "Không tìm thấy dịch vụ" });
        }
    },

    create: async (req, res) => {
        try {
            const data = await ServicesService.create(req.body);
            res.status(201).json(data);
        } catch (error) {
            console.error("create service error:", error);
            res.status(400).json({ message: error.message || "Lỗi tạo dịch vụ" });
        }
    },

    update: async (req, res) => {
        try {
            const data = await ServicesService.update(req.params.id, req.body);
            res.json(data);
        } catch (error) {
            console.error("update service error:", error);
            res.status(400).json({ message: error.message || "Lỗi cập nhật dịch vụ" });
        }
    },

    remove: async (req, res) => {
        try {
            const data = await ServicesService.remove(req.params.id);
            res.json(data);
        } catch (error) {
            console.error("remove service error:", error);
            res.status(400).json({ message: error.message || "Lỗi xóa dịch vụ" });
        }
    },

    getAllPackages: async (req, res) => {
        try {
            const data = await ServicesService.getAllPackages({
                keyword: req.query.keyword || "",
                trangThai: req.query.trangThai ?? ""
            });
            res.json(data);
        } catch (error) {
            console.error("getAllPackages error:", error);
            res.status(500).json({ message: error.message || "Lỗi lấy danh sách gói dịch vụ" });
        }
    },

    getPackageById: async (req, res) => {
        try {
            const data = await ServicesService.getPackageById(req.params.id);
            res.json(data);
        } catch (error) {
            console.error("getPackageById error:", error);
            res.status(404).json({ message: error.message || "Không tìm thấy gói dịch vụ" });
        }
    },

    createPackage: async (req, res) => {
        try {
            const data = await ServicesService.createPackage(req.body);
            res.status(201).json(data);
        } catch (error) {
            console.error("createPackage error:", error);
            res.status(400).json({ message: error.message || "Lỗi tạo gói dịch vụ" });
        }
    },

    updatePackage: async (req, res) => {
        try {
            const data = await ServicesService.updatePackage(req.params.id, req.body);
            res.json(data);
        } catch (error) {
            console.error("updatePackage error:", error);
            res.status(400).json({ message: error.message || "Lỗi cập nhật gói dịch vụ" });
        }
    },

    removePackage: async (req, res) => {
        try {
            const data = await ServicesService.removePackage(req.params.id);
            res.json(data);
        } catch (error) {
            console.error("removePackage error:", error);
            res.status(400).json({ message: error.message || "Lỗi xóa gói dịch vụ" });
        }
    },

    getAllConfigs: async (req, res) => {
        try {
            const data = await ServicesService.getAllConfigs({
                keyword: req.query.keyword || ""
            });
            res.json(data);
        } catch (error) {
            console.error("getAllConfigs error:", error);
            res.status(500).json({ message: error.message || "Lỗi lấy cấu hình dịch vụ" });
        }
    },

    getConfigByServiceId: async (req, res) => {
        try {
            const data = await ServicesService.getConfigByServiceId(req.params.serviceId);
            res.json(data);
        } catch (error) {
            console.error("getConfigByServiceId error:", error);
            res.status(404).json({ message: error.message || "Không tìm thấy cấu hình dịch vụ" });
        }
    },

    upsertConfig: async (req, res) => {
        try {
            const data = await ServicesService.upsertConfig(req.params.serviceId, req.body);
            res.json(data);
        } catch (error) {
            console.error("upsertConfig error:", error);
            res.status(400).json({ message: error.message || "Lỗi cập nhật cấu hình dịch vụ" });
        }
    }
};

export default ServicesController;