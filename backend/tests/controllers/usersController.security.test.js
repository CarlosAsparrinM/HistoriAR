import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/userService.js', () => ({
  createUser: vi.fn(),
  getAllUsers: vi.fn(),
  getUserById: vi.fn(),
  softDeleteUser: vi.fn(),
  updateUser: vi.fn(),
}));

const service = await import('../../src/services/userService.js');
const controller = await import('../../src/controllers/usersController.js');

function mockRes() {
  const res = { json: vi.fn() };
  res.status = vi.fn(() => res);
  return res;
}

describe('usersController administrative input', () => {
  beforeEach(() => vi.clearAllMocks());

  it('descarta campos no administrables al crear usuarios', async () => {
    service.createUser.mockResolvedValue({ _id: 'user-1' });
    const res = mockRes();

    await controller.createUserController({
      body: { name: 'Ana', email: 'ana@example.com', role: 'admin', createdAt: 'forged', unexpected: true },
    }, res);

    expect(service.createUser).toHaveBeenCalledWith({ name: 'Ana', email: 'ana@example.com', role: 'admin' });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('solo permite campos administrativos y conserva el alias profileImage', async () => {
    service.updateUser.mockResolvedValue({ _id: 'user-1', avatarUrl: 'avatar.png' });
    const res = mockRes();

    await controller.updateUserController({
      params: { id: 'user-1' },
      body: { status: 'Suspendido', profileImage: 'avatar.png', passwordHash: 'forged', updatedAt: 'forged' },
    }, res);

    expect(service.updateUser).toHaveBeenCalledWith('user-1', {
      status: 'Suspendido',
      avatarUrl: 'avatar.png',
    });
  });
});
