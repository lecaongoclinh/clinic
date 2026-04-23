import InventoryService from '../services/inventoryService.js';

function toCsvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

const InventoryController = {
    getAll: async (req, res) => {
        try {
            const data = await InventoryService.getAll(req.query);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: 'Lỗi lấy dữ liệu kho', error: err.message });
        }
    },

    getById: async (req, res) => {
        try {
            const data = await InventoryService.getById(req.params.id);
            if (!data) return res.status(404).json({ message: 'Không tìm thấy lô thuốc' });
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: 'Lỗi lấy chi tiết lô', error: err.message });
        }
    },

    getHistoryByLot: async (req, res) => {
        try {
            const data = await InventoryService.getHistoryByLot(req.params.id);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: 'Lỗi lấy lịch sử kho', error: err.message });
        }
    },

    getWarnings: async (req, res) => {
        try {
            const data = await InventoryService.getWarnings(req.query);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: 'Lỗi lấy cảnh báo kho', error: err.message });
        }
    },

    getStockCard: async (req, res) => {
        try {
            const data = await InventoryService.getStockCard(req.query);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: 'Lỗi lấy thẻ kho', error: err.message });
        }
    },

    exportInventory: async (req, res) => {
        try {
            const rows = await InventoryService.getAll(req.query);
            const headers = ['Mã lô', 'Thuốc', 'Hoạt chất', 'Số lô', 'Ngày sản xuất', 'Hạn dùng', 'Tồn', 'Giá nhập', 'Kho', 'Nhà cung cấp', 'Trạng thái'];
            const csvRows = [
                headers.map(toCsvCell).join(','),
                ...rows.map((row) => [
                    row.MaLo,
                    row.TenThuoc,
                    row.HoatChat,
                    row.SoLo,
                    row.NgaySanXuat,
                    row.HanSuDung,
                    row.Ton,
                    row.GiaNhap,
                    row.TenKho,
                    row.TenNCC,
                    row.TrangThai
                ].map(toCsvCell).join(','))
            ];

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="inventory-report.csv"');
            res.send(`\uFEFF${csvRows.join('\n')}`);
        } catch (err) {
            res.status(500).json({ message: 'Lỗi xuất báo cáo tồn kho', error: err.message });
        }
    },

    getAuditHistory: async (req, res) => {
        try {
            const data = await InventoryService.getAuditHistory(req.query);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: 'Lỗi lấy lịch sử kiểm kê', error: err.message });
        }
    },

    getAuditDetails: async (req, res) => {
        try {
            const data = await InventoryService.getAuditDetails(req.params.id);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: 'Lỗi lấy chi tiết phiếu kiểm kê', error: err.message });
        }
    },

    getAuditTemplate: async (req, res) => {
        try {
            const data = await InventoryService.getAuditTemplate(req.query);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: 'Lỗi lấy mẫu kiểm kê', error: err.message });
        }
    },

    createAudit: async (req, res) => {
        try {
            const data = await InventoryService.createAudit(req.body);
            res.status(201).json({ message: 'Tạo phiếu kiểm kê thành công', data });
        } catch (err) {
            res.status(500).json({ message: 'Lỗi tạo phiếu kiểm kê', error: err.message });
        }
    },

    balanceAudit: async (req, res) => {
        try {
            const data = await InventoryService.balanceAudit(req.params.id);
            res.json({ message: 'Cân bằng kho thành công', data });
        } catch (err) {
            res.status(500).json({ message: 'Lỗi cân bằng kho', error: err.message });
        }
    },

    transferLot: async (req, res) => {
        try {
            await InventoryService.transferLot(req.body);
            res.json({ message: 'Chuyển kho thành công' });
        } catch (err) {
            res.status(500).json({ message: 'Lỗi chuyển kho', error: err.message });
        }
    },

    deleteLot: async (req, res) => {
        try {
            await InventoryService.deleteLot(req.body);
            res.json({ message: 'Xử lý hủy thuốc thành công' });
        } catch (err) {
            res.status(500).json({ message: 'Lỗi hủy thuốc', error: err.message });
        }
    }
};

export default InventoryController;
