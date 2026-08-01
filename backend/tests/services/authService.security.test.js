import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'signed-token'),
  },
}));

vi.mock('../../src/models/User.js', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

const bcrypt = (await import('bcryptjs')).default;
const User = (await import('../../src/models/User.js')).default;
const { AuthError, loginUser, registerUser } = await import('../../src/services/authService.js');

describe('authService security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignora role y status enviados al registro público', async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('password-hash');
    User.create.mockImplementation(async (payload) => ({ _id: 'user-1', ...payload }));

    const user = await registerUser({
      name: '  Visitante  ',
      email: 'USER@Example.COM ',
      password: 'Password9',
      district: 'Lima',
      role: 'admin',
      status: 'Suspendido',
    });

    expect(User.create).toHaveBeenCalledWith({
      name: 'Visitante',
      email: 'user@example.com',
      password: 'password-hash',
      district: 'Lima',
      role: 'user',
      status: 'Activo',
    });
    expect(user.role).toBe('user');
    expect(user.status).toBe('Activo');
  });

  it('devuelve conflicto seguro cuando el correo ya existe', async () => {
    User.findOne.mockResolvedValue({ _id: 'existing-user' });

    await expect(registerUser({
      name: 'Visitante',
      email: 'user@example.com',
      password: 'Password9',
    })).rejects.toMatchObject({
      name: 'AuthError',
      statusCode: 409,
      code: 'EMAIL_ALREADY_EXISTS',
    });
    expect(User.create).not.toHaveBeenCalled();
  });

  it('normaliza el correo y solicita explícitamente el hash en login', async () => {
    const user = {
      _id: 'user-1',
      name: 'User',
      email: 'user@example.com',
      password: 'hash',
      role: 'user',
      status: 'Activo',
    };
    const select = vi.fn().mockResolvedValue(user);
    User.findOne.mockReturnValue({ select });
    bcrypt.compare.mockResolvedValue(true);

    const result = await loginUser(' USER@Example.COM ', 'Password9');

    expect(User.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(select).toHaveBeenCalledWith('+password');
    expect(result.token).toBe('signed-token');
  });

  it('usa un error 401 uniforme para credenciales desconocidas', async () => {
    User.findOne.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });

    let thrown;
    try {
      await loginUser('missing@example.com', 'Password9');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AuthError);
    expect(thrown).toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });
});
