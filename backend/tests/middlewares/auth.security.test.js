import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('jsonwebtoken', () => ({
  default: { verify: vi.fn() },
}));

vi.mock('../../src/models/User.js', () => ({
  default: { findById: vi.fn() },
}));

const jwt = (await import('jsonwebtoken')).default;
const User = (await import('../../src/models/User.js')).default;
const { verifyToken } = await import('../../src/middlewares/auth.js');

function mockRes() {
  const res = { json: vi.fn() };
  res.status = vi.fn(() => res);
  return res;
}

describe('verifyToken current authorization state', () => {
  beforeEach(() => vi.clearAllMocks());

  it('usa el rol vigente de MongoDB y no el rol antiguo del JWT', async () => {
    jwt.verify.mockReturnValue({ sub: 'user-1', role: 'admin', name: 'Old Admin' });
    const currentUser = {
      _id: { toString: () => 'user-1' },
      name: 'Current User',
      email: 'user@example.com',
      role: 'user',
      status: 'Activo',
    };
    const select = vi.fn().mockResolvedValue(currentUser);
    User.findById.mockReturnValue({ select });
    const req = { headers: { authorization: 'Bearer valid-token' } };
    const res = mockRes();
    const next = vi.fn();

    await verifyToken(req, res, next);

    expect(select).toHaveBeenCalledWith('name email role status');
    expect(req.user).toEqual({
      id: 'user-1',
      name: 'Current User',
      email: 'user@example.com',
      role: 'user',
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it('acepta una cookie administrativa valida en una lectura', async () => {
    jwt.verify.mockReturnValue({ sub: 'admin-1', tokenUse: 'admin-session', csrf: 'csrf-value' });
    const currentUser = {
      _id: { toString: () => 'admin-1' },
      name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
      status: 'Activo',
    };
    User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(currentUser) });
    const req = {
      method: 'GET',
      headers: { cookie: 'historiar_admin_session=cookie-token' },
      get: vi.fn(),
    };
    const res = mockRes();
    const next = vi.fn();

    await verifyToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('cookie-token', process.env.JWT_SECRET);
    expect(req.authSource).toBe('admin-cookie');
    expect(next).toHaveBeenCalledOnce();
  });

  it('rechaza una mutacion por cookie sin el encabezado CSRF correcto', async () => {
    jwt.verify.mockReturnValue({ sub: 'admin-1', tokenUse: 'admin-session', csrf: 'expected' });
    const req = {
      method: 'POST',
      headers: { cookie: 'historiar_admin_session=cookie-token' },
      get: vi.fn().mockReturnValue('incorrect'),
    };
    const res = mockRes();
    const next = vi.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'CSRF_INVALID' }));
    expect(User.findById).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza un token de sesion administrativa enviado como Bearer', async () => {
    jwt.verify.mockReturnValue({ sub: 'admin-1', tokenUse: 'admin-session', csrf: 'expected' });
    const req = { method: 'GET', headers: { authorization: 'Bearer admin-cookie-token' } };
    const res = mockRes();
    const next = vi.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(User.findById).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
