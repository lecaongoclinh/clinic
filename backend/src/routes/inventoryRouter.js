import express from 'express';
import InventoryController from '../controllers/inventoryController.js';

const router = express.Router();

router.get('/warnings', InventoryController.getWarnings);
router.get('/stock-card', InventoryController.getStockCard);
router.get('/export', InventoryController.exportInventory);
router.get('/audits', InventoryController.getAuditHistory);
router.get('/audits/:id', InventoryController.getAuditDetails);
router.get('/audit-template', InventoryController.getAuditTemplate);
router.get('/history/:id', InventoryController.getHistoryByLot);
router.get('/:id', InventoryController.getById);
router.get('/', InventoryController.getAll);

router.post('/audits', InventoryController.createAudit);
router.post('/audits/:id/balance', InventoryController.balanceAudit);
router.post('/transfer', InventoryController.transferLot);
router.post('/delete', InventoryController.deleteLot);

export default router;
