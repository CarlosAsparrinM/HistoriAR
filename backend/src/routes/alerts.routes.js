import express from 'express';
import * as alertsController from '../controllers/alerts.controller.js';
import * as dataIntegrityController from '../controllers/dataIntegrity.controller.js';
import { requireRole, verifyToken } from '../middlewares/auth.js';

const router = express.Router();

// Las alertas revelan información operativa y permiten mutaciones globales.
// Todo el recurso queda restringido a administradores.
router.use(verifyToken, requireRole('admin'));

// GET alertas de integridad de datos (análisis en tiempo real)
router.get('/integrity-check', dataIntegrityController.getDataIntegrityAlerts);

// GET resumen de problemas de integridad
router.get('/integrity-summary', dataIntegrityController.getDataIntegritySummary);

// POST limpiar caché de integridad (debug)
router.post('/integrity-cache-clear', dataIntegrityController.clearIntegrityCache);

// GET todas las alertas
router.get('/', alertsController.getAllAlerts);

// GET resumen de alertas
router.get('/summary', alertsController.getAlertsSummary);

// GET alerta por ID
router.get('/:id', alertsController.getAlertById);

// POST crear alerta
router.post('/', alertsController.createAlert);

// PATCH marcar como leída
router.patch('/:id/read', alertsController.markAsRead);

// PATCH marcar como no leída
router.patch('/:id/unread', alertsController.markAsUnread);

// PATCH descartar alerta
router.patch('/:id/dismiss', alertsController.dismissAlert);

// PATCH marcar todas como leídas
router.patch('/mark-all-read', alertsController.markAllAsRead);

// DELETE alerta
router.delete('/:id', alertsController.deleteAlert);

export default router;
