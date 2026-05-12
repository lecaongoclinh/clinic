import DispenseService from "../services/dispenseService.js";

function handleError(res, error) {
    res.status(500).json({ message: error.message });
}

const DispenseController = {
    getBootstrap: async (req, res) => {
        try {
            const data = await DispenseService.getBootstrap(req.query.MaKho);
            res.json(data);
        } catch (error) {
            handleError(res, error);
        }
    },

    getDispenseWarehouse: async (_req, res) => {
        try {
            const data = await DispenseService.getDispenseWarehouse();
            if (!data) return res.status(404).json({ message: "Chưa cấu hình kho cấp phát" });
            res.json(data);
        } catch (error) {
            handleError(res, error);
        }
    },

    getCatalog: async (req, res) => {
        try {
            const data = await DispenseService.getCatalog(req.query);
            res.json(data);
        } catch (error) {
            handleError(res, error);
        }
    },

    getMedicinePreview: async (req, res) => {
        try {
            const data = await DispenseService.getMedicinePreview({
                MaThuoc: req.params.id,
                MaKho: req.query.MaKho,
                MaNCC: req.query.MaNCC,
                SoLuong: req.query.SoLuong || 1
            });
            res.json(data);
        } catch (error) {
            handleError(res, error);
        }
    },

    getReturnableSupplierLots: async (req, res) => {
        try {
            const data = await DispenseService.getReturnableSupplierLots(req.query);
            res.json(data);
        } catch (error) {
            handleError(res, error);
        }
    },

    getPendingPrescriptions: async (_req, res) => {
        try {
            const data = await DispenseService.getPendingPrescriptions();
            res.json(data);
        } catch (error) {
            handleError(res, error);
        }
    },

    getPrescriptionDetail: async (req, res) => {
        try {
            const data = await DispenseService.getPrescriptionDetail({
                MaDT: req.params.id,
                MaKho: req.query.MaKho
            });
            res.json(data);
        } catch (error) {
            handleError(res, error);
        }
    },

    getAlternativeMedicines: async (req, res) => {
        try {
            const data = await DispenseService.getAlternativeMedicines({
                MaThuoc: req.params.id,
                MaKho: req.query.MaKho
            });
            res.json(data);
        } catch (error) {
            handleError(res, error);
        }
    },

    getRecentHistory: async (req, res) => {
        try {
            const data = await DispenseService.getRecentHistory({
                MaThuoc: req.query.MaThuoc,
                limit: req.query.limit
            });
            res.json(data);
        } catch (error) {
            handleError(res, error);
        }
    },

    saveDraft: async (req, res) => {
        try {
            const data = await DispenseService.saveDraft(req.body);
            res.json(data);
        } catch (error) {
            handleError(res, error);
        }
    },

    getDraftById: async (req, res) => {
        try {
            const data = await DispenseService.getDraftById(req.params.id);
            res.json(data);
        } catch (error) {
            handleError(res, error);
        }
    },

    completeDraft: async (req, res) => {
        try {
            const data = await DispenseService.completeDraft(req.params.id);
            res.json(data);
        } catch (error) {
            handleError(res, error);
        }
    }
};

export default DispenseController;
