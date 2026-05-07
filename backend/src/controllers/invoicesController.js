import InvoicesService from "../services/invoicesService.js";

const InvoicesController = {
    getDashboard: async (req, res) => {
        try {
            const data = await InvoicesService.getDashboard({
                keyword: req.query.keyword || "",
                status: req.query.status || "",
                date: req.query.date || "",
                doctor: req.query.doctor || ""
            });

            res.json(data);
        } catch (error) {
            console.error("getDashboard invoices error:", error);
            res.status(500).json({
                message: error.message || "Lỗi lấy dashboard hóa đơn"
            });
        }
    },

    getAll: async (req, res) => {
        try {
            const data = await InvoicesService.getAll({
                keyword: req.query.keyword || "",
                status: req.query.status || "",
                date: req.query.date || "",
                doctor: req.query.doctor || ""
            });

            res.json(data);
        } catch (error) {
            console.error("getAll invoices error:", error);
            res.status(500).json({
                message: error.message || "Lỗi lấy danh sách hóa đơn"
            });
        }
    },

    getById: async (req, res) => {
        try {
            const data = await InvoicesService.getById(req.params.id);
            res.json(data);
        } catch (error) {
            console.error("getById invoice error:", error);
            res.status(404).json({
                message: error.message || "Không tìm thấy hóa đơn"
            });
        }
    },

    getDetails: async (req, res) => {
        try {
            const data = await InvoicesService.getDetails(req.params.id);
            res.json(data);
        } catch (error) {
            console.error("getDetails invoice error:", error);
            res.status(404).json({
                message: error.message || "Không tìm thấy chi tiết hóa đơn"
            });
        }
    },

    create: async (req, res) => {
        try {
            const data = await InvoicesService.create(req.body);
            res.status(201).json(data);
        } catch (error) {
            console.error("create invoice error:", error);
            res.status(400).json({
                message: error.message || "Lỗi tạo hóa đơn"
            });
        }
    },

    update: async (req, res) => {
        try {
            const data = await InvoicesService.update(req.params.id, req.body);
            res.json(data);
        } catch (error) {
            console.error("update invoice error:", error);
            res.status(400).json({
                message: error.message || "Lỗi cập nhật hóa đơn"
            });
        }
    },

    pay: async (req, res) => {
        try {
            const data = await InvoicesService.pay(req.params.id, req.body);
            res.json(data);
        } catch (error) {
            console.error("pay invoice error:", error);
            res.status(400).json({
                message: error.message || "Lỗi thanh toán hóa đơn"
            });
        }
    },

    cancel: async (req, res) => {
        try {
            const data = await InvoicesService.cancel(req.params.id);
            res.json(data);
        } catch (error) {
            console.error("cancel invoice error:", error);
            res.status(400).json({
                message: error.message || "Lỗi hủy hóa đơn"
            });
        }
    },

    refund: async (req, res) => {
        try {
            const data = await InvoicesService.refund(req.params.id, req.body);
            res.json(data);
        } catch (error) {
            console.error("refund invoice error:", error);
            res.status(400).json({
                message: error.message || "Lỗi hoàn tiền hóa đơn"
            });
        }
    },

    addVisitServices: async (req, res) => {
        try {
            const data = await InvoicesService.addServiceItemsForVisit({
                ...req.body,
                MaPK: req.params.ticketId
            });
            res.json(data);
        } catch (error) {
            console.error("add visit services invoice error:", error);
            res.status(400).json({
                message: error.message || "Loi them dich vu vao hoa don"
            });
        }
    },

    remove: async (req, res) => {
        try {
            const data = await InvoicesService.remove(req.params.id);
            res.json(data);
        } catch (error) {
            console.error("remove invoice error:", error);
            res.status(400).json({
                message: error.message || "Lỗi xóa hóa đơn"
            });
        }
    }
};

export default InvoicesController;
