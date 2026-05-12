import InventoryService from "../services/inventoryService.js";
import jwt from "jsonwebtoken";

function getAuthUser(req) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return null;

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        return {
            MaNV: payload.id,
            Username: payload.userName,
            MaVaiTro: Number(payload.role)
        };
    } catch {
        return null;
    }
}

function toCsvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

const InventoryController = {
    getAll: async (req, res) => {
        try {
            const data = await InventoryService.getAll(req.query);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy dữ liệu kho", error: err.message });
        }
    },

    getById: async (req, res) => {
        try {
            const data = await InventoryService.getById(req.params.id);
            if (!data) return res.status(404).json({ message: "Không tìm thấy lô thuốc" });
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy chi tiết lô", error: err.message });
        }
    },

    getHistoryByLot: async (req, res) => {
        try {
            const data = await InventoryService.getHistoryByLot(req.params.id);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy lịch sử kho", error: err.message });
        }
    },

    getWarnings: async (req, res) => {
        try {
            const data = await InventoryService.getWarnings(req.query);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy cảnh báo kho", error: err.message });
        }
    },

    getStockCard: async (req, res) => {
        try {
            const data = await InventoryService.getStockCard(req.query);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy thẻ kho", error: err.message });
        }
    },

    exportInventory: async (req, res) => {
        try {
            const rows = await InventoryService.getAll(req.query);
            const headers = ["Mã lô", "Thuốc", "Hoạt chất", "Số lô", "Ngày sản xuất", "Hạn dùng", "Tồn", "Đơn vị", "Giá nhập", "Kho", "Loại kho", "Nhà cung cấp", "Trạng thái"];
            const csvRows = [
                headers.map(toCsvCell).join(","),
                ...rows.map((row) => [
                    row.MaLo,
                    row.TenThuoc,
                    row.HoatChat,
                    row.SoLo,
                    row.NgaySanXuat,
                    row.HanSuDung,
                    row.Ton,
                    row.DonViCoBan,
                    row.GiaNhap,
                    row.TenKho,
                    row.IsDispenseWarehouse ? "DISPENSE" : row.LoaiKho,
                    row.TenNCC,
                    row.TrangThai
                ].map(toCsvCell).join(","))
            ];

            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", 'attachment; filename="inventory-report.csv"');
            res.send(`\uFEFF${csvRows.join("\n")}`);
        } catch (err) {
            res.status(500).json({ message: "Lỗi xuất báo cáo tồn kho", error: err.message });
        }
    },

    getAuditHistory: async (req, res) => {
        try {
            const data = await InventoryService.getAuditHistory(req.query);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy lịch sử kiểm kê", error: err.message });
        }
    },

    getAuditDetails: async (req, res) => {
        try {
            const data = await InventoryService.getAuditDetails(req.params.id);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy chi tiết phiếu kiểm kê", error: err.message });
        }
    },

    getAuditTemplate: async (req, res) => {
        try {
            const data = await InventoryService.getAuditTemplate(req.query);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: "Lỗi lấy mẫu kiểm kê", error: err.message });
        }
    },

    createAudit: async (req, res) => {
        try {
            const user = getAuthUser(req);
            const data = await InventoryService.createAudit({
                ...req.body,
                MaNhanVien: user?.MaNV || req.body.MaNhanVien || null
            });
            res.status(201).json({ message: "Tạo phiếu kiểm kê thành công", data });
        } catch (err) {
            res.status(400).json({ message: err.message || "Lỗi tạo phiếu kiểm kê", error: err.message });
        }
    },

    balanceAudit: async (req, res) => {
        try {
            const data = await InventoryService.balanceAudit(req.params.id);
            res.json({ message: "Cân bằng kho thành công", data });
        } catch (err) {
            res.status(500).json({ message: "Lỗi cân bằng kho", error: err.message });
        }
    },

    transferLot: async (req, res) => {
        try {
            const user = getAuthUser(req);
            await InventoryService.transferLot({
                ...req.body,
                MaNhanVien: user?.MaNV || req.body.MaNhanVien || null
            });
            res.json({ message: "Chuyển kho thành công" });
        } catch (err) {
            res.status(500).json({ message: "Lỗi chuyển kho", error: err.message });
        }
    },

    deleteLot: async (req, res) => {
        try {
            const user = getAuthUser(req);
            await InventoryService.deleteLot({
                ...req.body,
                MaNhanVien: user?.MaNV || req.body.MaNhanVien || null
            });
            res.json({ message: "Lập phiếu hủy thuốc thành công" });
        } catch (err) {
            res.status(400).json({ message: err.message || "Lỗi hủy thuốc", error: err.message });
        }
    }
};

export default InventoryController;
