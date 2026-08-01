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
});
