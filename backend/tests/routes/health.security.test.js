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

vi.mock('../../src/config/s3.js', () => ({
  verifyS3Connection: vi.fn().mockResolvedValue(true),
}));

const { default: healthRouter } = await import('../../src/routes/health.routes.js');
const app = express();
app.use('/api/health', healthRouter);

describe('health route exposure', () => {
  it('expone readiness sin revelar configuración interna', async () => {
    const response = await request(app).get('/api/health');
    expect([200, 503]).toContain(response.status);
    expect(response.body).not.toHaveProperty('bucket');
    expect(response.body).not.toHaveProperty('region');
  });

  it('protege la comprobación detallada de S3', async () => {
    expect((await request(app).get('/api/health/s3')).status).toBe(401);
    expect((await request(app).get('/api/health/s3').set('x-test-role', 'user')).status).toBe(403);
    expect((await request(app).get('/api/health/s3').set('x-test-role', 'admin')).status).toBe(200);
  });
});
