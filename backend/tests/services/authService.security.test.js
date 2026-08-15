import { beforeEach, describe, expect, it, vi } from 'vitest';

const googleMocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
}));

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

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn(() => ({ verifyIdToken: googleMocks.verifyIdToken })),
}));

vi.mock('../../src/models/User.js', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

const bcrypt = (await import('bcryptjs')).default;
const User = (await import('../../src/models/User.js')).default;
const { AuthError, initializeGoogleAuth, loginUser, loginWithGoogle, registerUser } = await import('../../src/services/authService.js');

describe('authService security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    User.findOne.mockReset();
    User.create.mockReset();
    process.env.GOOGLE_CLIENT_ID = 'google-client-id';
    process.env.JWT_SECRET = 'test-secret';
    initializeGoogleAuth();
  });

  it('ignora role y status enviados al registro público', async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('password-hash');
    User.create.mockImplementation(async (payload) => ({ _id: 'user-1', ...payload }));

    const user = await registerUser({
      name: '  Visitante  ',
      email: 'USER@Example.COM ',
      password: 'Password9',
      termsAccepted: true,
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
      termsAcceptedAt: expect.any(Date),
      termsVersion: expect.any(String),
      privacyVersion: expect.any(String),
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
      termsAccepted: true,
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

  it('no crea cuentas al iniciar sesión con Google si no existe una identidad registrada', async () => {
    googleMocks.verifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: 'google-subject', email: 'user@example.com', email_verified: true }),
    });
    User.findOne.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });

    await expect(loginWithGoogle({
      idToken: 'id-token',
      intent: 'login',
      termsAccepted: false,
    })).rejects.toMatchObject({
      statusCode: 404,
      code: 'GOOGLE_ACCOUNT_NOT_FOUND',
    });
    expect(User.create).not.toHaveBeenCalled();
  });

  it('acepta como audience los clientes configurados para móvil y web', async () => {
    process.env.GOOGLE_MOBILE_CLIENT_ID = 'mobile-client-id';
    process.env.GOOGLE_WEB_CLIENT_ID = 'web-client-id';
    googleMocks.verifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: 'google-subject', email: 'user@example.com', email_verified: true }),
    });
    User.findOne.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });

    await expect(loginWithGoogle({
      idToken: 'id-token',
      intent: 'login',
      termsAccepted: false,
    })).rejects.toMatchObject({ code: 'GOOGLE_ACCOUNT_NOT_FOUND' });
    expect(googleMocks.verifyIdToken).toHaveBeenCalledWith(expect.objectContaining({
      audience: expect.arrayContaining(['mobile-client-id', 'web-client-id']),
    }));
  });

  it('solo registra con Google después de aceptar los términos', async () => {
    googleMocks.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-subject',
        email: 'new@example.com',
        email_verified: true,
        name: 'New User',
      }),
    });
    User.findOne
      .mockReturnValueOnce({ select: vi.fn().mockResolvedValue(null) })
      .mockResolvedValueOnce(null);
    User.create.mockImplementation(async (payload) => ({ _id: 'user-1', ...payload }));

    await expect(loginWithGoogle({
      idToken: 'id-token',
      intent: 'register',
      termsAccepted: false,
    })).rejects.toMatchObject({ code: 'TERMS_ACCEPTANCE_REQUIRED' });
    expect(User.create).not.toHaveBeenCalled();

    const result = await loginWithGoogle({
      idToken: 'id-token',
      intent: 'register',
      termsAccepted: true,
    });
    expect(result.token).toBe('signed-token');
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      googleSubject: 'google-subject',
      termsAcceptedAt: expect.any(Date),
    }));
  });
});
