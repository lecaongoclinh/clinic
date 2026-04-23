import InventoryModel from "../models/inventoryModel.js";

const InventoryService = {
    getAll: async (filters) => InventoryModel.getAll(filters),
    getById: async (id) => InventoryModel.getById(id),
    getHistoryByLot: async (id) => InventoryModel.getHistoryByLot(id),
    getWarnings: async (filters) => InventoryModel.getWarnings(filters),
    getStockCard: async (filters) => InventoryModel.getStockCard(filters),
    getAuditHistory: async (filters) => InventoryModel.getAuditHistory(filters),
    getAuditDetails: async (id) => InventoryModel.getAuditDetails(id),
    getAuditTemplate: async (filters) => InventoryModel.getAuditTemplate(filters),
    createAudit: async (payload) => InventoryModel.createAudit(payload),
    balanceAudit: async (id) => InventoryModel.balanceAudit(id),
    transferLot: async (payload) => InventoryModel.transferLot(payload),
    deleteLot: async (payload) => InventoryModel.deleteLot(payload)
};

export default InventoryService;
