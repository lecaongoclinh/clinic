import ImportsService from "../services/importsService.js";
import MedicinesService from "../services/medicinesService.js";

const ImportsController = {

    getAll: async (req, res) => {
        try {
            const data = await ImportsService.getAll();
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getById: async (req, res) => {
        try {
            const data = await ImportsService.getById(req.params.id);
            if (!data) {
                return res.status(404).json({ message: "Không tìm thấy" });
            }
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getItems: async (req, res) => {
        try {
            const data = await ImportsService.getItems(req.params.id);
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    // LOAD THUỐC THEO NCC
    getBySupplier: async (req, res) => {
        try {
            const { MaNCC } = req.query;

            if (!MaNCC) {
                return res.status(400).json({ message: "Thiếu MaNCC" });
            }

            const data = await MedicinesService.getMedicinesBySupplier(MaNCC);
            res.json(data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    create: async (req, res) => {
        try {
            const id = await ImportsService.createImport(req.body);

            res.status(201).json({
                message: "Tạo phiếu nhập thành công",
                MaPN: id
            });

        } catch (err) {
            res.status(500).json({
                message: err.message
            });
        }
    }

};

export default ImportsController;