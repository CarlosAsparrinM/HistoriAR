import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const controllerMocks = vi.hoisted(() => ({
  login: vi.fn((req, res) => res.json({ ok: true })),
  register: vi.fn((req, res) => res.status(201).json({ ok: true })),
  googleLogin: vi.fn((req, res) => res.json({ ok: true })),
  validateToken: vi.fn((req, res) => res.json({ ok: true })),
}));

vi.mock('../../src/controllers/authController.js', () => controllerMocks);
vi.mock('../../src/middlewares/auth.js', () => ({
  verifyToken: (req, res, next) => next(),
}));

const { default: authRouter } = await import('../../src/routes/auth.routes.js');
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('auth request validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rechaza email inválido antes del controlador de registro', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'User', email: 'invalid', password: 'Password9' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(controllerMocks.register).not.toHaveBeenCalled();
  });

  it('rechaza payloads sin contraseña en login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com' });

    expect(response.status).toBe(400);
    expect(response.body.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'password' }),
    ]));
    expect(controllerMocks.login).not.toHaveBeenCalled();
  });

  it('normaliza email válido antes de llamar al controlador', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: ' USER@Example.COM ', password: 'Password9' });

    expect(response.status).toBe(200);
    expect(controllerMocks.login).toHaveBeenCalledOnce();
    const [req] = controllerMocks.login.mock.calls[0];
    expect(req.body.email).toBe('user@example.com');
  });
});
