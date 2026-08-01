import 'dotenv/config';
import { pathToFileURL } from 'node:url';

import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { initializeS3Client } from './config/s3.js';
import { validateEnvironment } from './config/validateEnv.js';
import { initializeGoogleAuth } from './services/authService.js';

const DEFAULT_PORT = 4000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

export async function startServer({ port = process.env.PORT || DEFAULT_PORT } = {}) {
  validateEnvironment();

  try {
    initializeGoogleAuth();
  } catch (error) {
    console.warn('Google Auth no está disponible:', error.message);
  }

  await connectDB(process.env.MONGODB_URI);
  initializeS3Client();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`HistoriAR API escuchando en 0.0.0.0:${port}`);
      resolve(server);
    });
    server.once('error', reject);
  });
}

export async function stopServer(server) {
  if (server?.listening) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await disconnectDB();
}

function installShutdownHandlers(server) {
  let shuttingDown = false;

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} recibido; cerrando conexiones`);

    const forceExitTimer = setTimeout(() => {
      console.error('Cierre forzado por timeout');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExitTimer.unref();

    try {
      await stopServer(server);
      clearTimeout(forceExitTimer);
      process.exit(0);
    } catch (error) {
      console.error('Error durante el cierre:', error.message);
      process.exit(1);
    }
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

const isMainModule = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  startServer()
    .then(installShutdownHandlers)
    .catch((error) => {
      console.error('No se pudo iniciar HistoriAR API:', error.message);
      process.exitCode = 1;
    });
}

export default app;
