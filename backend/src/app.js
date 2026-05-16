import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import { connectDB } from './config/db.js';

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

// Initialize DB connection
connectDB().catch(err => console.error('Initial DB connection failed:', err.message));

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
    // Debug: log the origin to help diagnose CORS issues (visible in Vercel logs)
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

app.use((req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

export default app;
