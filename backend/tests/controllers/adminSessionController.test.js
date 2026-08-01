import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({ loginUser: vi.fn() }));
const sessionMocks = vi.hoisted(() => ({
  createAdminSessionToken: vi.fn(),
  getAdminCookieOptions: vi.fn(() => ({ httpOnly: true, secure: true, sameSite: 'lax', path: '/api' })),
}));

vi.mock('../../src/services/authService.js', () => ({
  loginUser: serviceMocks.loginUser,
  loginWithGoogle: vi.fn(),
  registerUser: vi.fn(),
}));
vi.mock('../../src/utils/adminSession.js', () => ({
  ADMIN_SESSION_COOKIE: 'historiar_admin_session',
  createAdminSessionToken: sessionMocks.createAdminSessionToken,
  getAdminCookieOptions: sessionMocks.getAdminCookieOptions,
}));

const { adminLogin, adminLogout, adminSession } = await import('../../src/controllers/authController.js');

function mockRes() {
  const res = { cookie: vi.fn(), clearCookie: vi.fn(), json: vi.fn(), send: vi.fn() };
  res.status = vi.fn(() => res);
  return res;
}

describe('admin session controller', () => {
  beforeEach(() => vi.clearAllMocks());

  it('crea una cookie HttpOnly sin devolver el JWT al panel', async () => {
    const user = { _id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'admin' };
    serviceMocks.loginUser.mockResolvedValue({ token: 'mobile-token', user });
    sessionMocks.createAdminSessionToken.mockReturnValue({ token: 'cookie-jwt', csrfToken: 'csrf-token' });
    const res = mockRes();

    await adminLogin({ body: { email: user.email, password: 'Password9' } }, res);

    expect(res.cookie).toHaveBeenCalledWith(
      'historiar_admin_session',
      'cookie-jwt',
      expect.objectContaining({ httpOnly: true, secure: true, path: '/api' }),
    );
    expect(res.json).toHaveBeenCalledWith({
      user: { id: 'admin-1', name: 'Admin', email: user.email, role: 'admin' },
      csrfToken: 'csrf-token',
    });
    expect(res.json.mock.calls[0][0]).not.toHaveProperty('token');
  });

  it('no crea sesion web para un usuario sin rol admin', async () => {
    serviceMocks.loginUser.mockResolvedValue({ user: { _id: 'user-1', role: 'user' } });
    const res = mockRes();

    await adminLogin({ body: { email: 'user@example.com', password: 'Password9' } }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('restaura el usuario y CSRF desde una sesion ya verificada', () => {
    const res = mockRes();
    adminSession({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'admin' },
      authPayload: { csrf: 'csrf-token' },
    }, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ csrfToken: 'csrf-token' }));
  });

  it('elimina la cookie con los mismos atributos al cerrar sesion', () => {
    const res = mockRes();
    adminLogout({}, res);

    expect(res.clearCookie).toHaveBeenCalledWith(
      'historiar_admin_session',
      expect.objectContaining({ httpOnly: true, path: '/api' }),
    );
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
