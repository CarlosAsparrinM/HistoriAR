import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/users.routes.js';
import institutionRoutes from './routes/institutions.routes.js';
import monumentRoutes from './routes/monuments.routes.js';
import categoryRoutes from './routes/categories.routes.js';
import cultureRoutes from './routes/cultures.routes.js';
import historicalDataRoutes from './routes/historicalData.routes.js';
import visitRoutes from './routes/visits.routes.js';
import quizRoutes from './routes/quizzes.routes.js';
import uploadRoutes from './routes/uploads.routes.js';
import healthRoutes from './routes/health.routes.js';
import tourRoutes from './routes/tours.routes.js';
import locationRoutes from './routes/location.routes.js';
import alertsRoutes from './routes/alerts.routes.js';
import statsRoutes from './routes/stats.routes.js';

config();

const app = express();

// Solo confiar en proxies cuando el operador del contenedor conoce el número
// exacto de saltos. Esto permite que req.ip y el rate limiting usen la IP real
// sin aceptar X-Forwarded-For arbitrario por defecto.
const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS || '0', 10);
if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) {
  app.set('trust proxy', trustProxyHops);
}

// CORS configuration
// Get allowed origins from environment variable or use defaults for development
const defaultOrigins = process.env.NODE_ENV === 'production' 
  ? [] 
  : ['http://localhost:5173', 'http://localhost:5175', 'http://localhost:3000', 'http://localhost:4000'];

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : defaultOrigins;

// Log allowed origins for debugging (helpful in production)
console.log('CORS allowed origins:', allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    // Debug: visible en los logs del contenedor Docker.
    // Allow requests with no origin (mobile apps, Postman, etc.)
    console.log('CORS origin received:', origin);
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Ensure preflight requests are handled and CORS headers are returned for OPTIONS
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.get('/', (_req, res) => res.json({ name: 'HistoriAR API', status: 'ok' }));

// Health check endpoint for AWS ALB/Target Group (simple version)
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/monuments', monumentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cultures', cultureRoutes);
app.use('/api', historicalDataRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/tours', tourRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/stats', statsRoutes);

app.use((err, _req, res, next) => {
  if (res.headersSent) return next(err);

  if (err?.name === 'MulterError') {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      message: status === 413 ? 'El archivo excede el tamaño permitido' : 'Upload inválido'
    });
  }

  if (err?.message?.startsWith('Invalid image format')
      || err?.message?.startsWith('Invalid file format')) {
    return res.status(400).json({ message: err.message });
  }

  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Origen no permitido' });
  }

  console.error('Unhandled request error:', err);
  return res.status(500).json({ message: 'Error interno del servidor' });
});

app.use((req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

export default app;
