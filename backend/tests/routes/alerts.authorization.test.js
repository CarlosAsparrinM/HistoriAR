import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/middlewares/auth.js', () => ({
  verifyToken: (req, res, next) => {
    const role = req.headers['x-test-role'];
    if (!role) return res.status(401).json({ message: 'Token faltante' });
    req.user = { id: 'test-user', role };
    return next();
  },
  requireRole: (...roles) => (req, res, next) => (
    roles.includes(req.user?.role)
      ? next()
      : res.status(403).json({ message: 'Acceso denegado' })
  ),
}));

vi.mock('../../src/controllers/alerts.controller.js', () => ({
  getAllAlerts: (req, res) => res.json({ data: [] }),
  getAlertsSummary: (req, res) => res.json({ total: 0 }),
  getAlertById: (req, res) => res.json({ id: req.params.id }),
  createAlert: (req, res) => res.status(201).json({ created: true }),
  markAsRead: (req, res) => res.json({ read: true }),
  markAsUnread: (req, res) => res.json({ read: false }),
  dismissAlert: (req, res) => res.json({ dismissed: true }),
  markAllAsRead: (req, res) => res.json({ updated: true }),
  deleteAlert: (req, res) => res.json({ deleted: true }),
}));

vi.mock('../../src/controllers/dataIntegrity.controller.js', () => ({
  getDataIntegrityAlerts: (req, res) => res.json({ alerts: [] }),
  getDataIntegritySummary: (req, res) => res.json({ total: 0 }),
  clearIntegrityCache: (req, res) => res.json({ cleared: true }),
}));

const { default: alertsRouter } = await import('../../src/routes/alerts.routes.js');
const app = express();
app.use(express.json());
app.use('/api/alerts', alertsRouter);

describe('alerts route authorization', () => {
  it('rechaza peticiones anónimas', async () => {
    const response = await request(app).get('/api/alerts/summary');
    expect(response.status).toBe(401);
  });

  it('rechaza usuarios sin rol admin', async () => {
    const response = await request(app)
      .get('/api/alerts/summary')
      .set('x-test-role', 'user');
    expect(response.status).toBe(403);
  });

  it('permite administradores', async () => {
    const response = await request(app)
      .get('/api/alerts/summary')
      .set('x-test-role', 'admin');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ total: 0 });
  });
});
