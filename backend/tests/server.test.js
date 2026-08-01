import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const server = {
    listening: true,
    once: vi.fn(),
    close: vi.fn((callback) => callback()),
  };
  return {
    server,
    listen: vi.fn((_port, _host, callback) => {
      queueMicrotask(callback);
      return server;
    }),
    connectDB: vi.fn(),
    disconnectDB: vi.fn(),
    initializeS3Client: vi.fn(),
    validateEnvironment: vi.fn(),
    initializeGoogleAuth: vi.fn(),
  };
});

vi.mock('../src/app.js', () => ({
  default: { listen: mocks.listen },
}));
vi.mock('../src/config/db.js', () => ({
  connectDB: mocks.connectDB,
  disconnectDB: mocks.disconnectDB,
}));
vi.mock('../src/config/s3.js', () => ({
  initializeS3Client: mocks.initializeS3Client,
}));
vi.mock('../src/config/validateEnv.js', () => ({
  validateEnvironment: mocks.validateEnvironment,
}));
vi.mock('../src/services/authService.js', () => ({
  initializeGoogleAuth: mocks.initializeGoogleAuth,
}));

const { startServer, stopServer } = await import('../src/server.js');

describe('Docker server bootstrap', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inicia también en producción y escucha en todas las interfaces', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MONGODB_URI = 'mongodb://database/historiar';

    const server = await startServer({ port: 4000 });

    expect(mocks.validateEnvironment).toHaveBeenCalledOnce();
    expect(mocks.connectDB).toHaveBeenCalledWith(process.env.MONGODB_URI);
    expect(mocks.initializeS3Client).toHaveBeenCalledOnce();
    expect(mocks.listen).toHaveBeenCalledWith(4000, '0.0.0.0', expect.any(Function));
    expect(server).toBe(mocks.server);
  });

  it('cierra HTTP y MongoDB de forma ordenada', async () => {
    await stopServer(mocks.server);

    expect(mocks.server.close).toHaveBeenCalledOnce();
    expect(mocks.disconnectDB).toHaveBeenCalledOnce();
  });
});
