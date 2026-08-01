import { Router } from 'express';
import mongoose from 'mongoose';
import { verifyS3Connection } from '../config/s3.js';
import { requireRole, verifyToken } from '../middlewares/auth.js';

const router = Router();

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/', (_req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    services: { database: databaseConnected ? 'connected' : 'disconnected' }
  });
});

/**
 * S3 specific health check
 * GET /api/health/s3
 */
router.get('/s3', verifyToken, requireRole('admin'), async (_req, res) => {
  try {
    await verifyS3Connection();
    res.json({
      status: 'OK',
      message: 'S3 connection verified'
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      message: 'S3 connection failed'
    });
  }
});

export default router;
