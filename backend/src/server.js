import { config } from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initializeS3Client, verifyS3Connection, createFolderStructure } from './config/s3.js';
import { validateEnvironment } from './config/validateEnv.js';
import { initializeGoogleAuth } from './services/authService.js';

config();

// Validate environment variables before starting the server
validateEnvironment();

// Initialize Google Auth after dotenv is loaded
try {
  initializeGoogleAuth();
} catch (err) {
  console.error('❌ Error initializing Google Auth:', err.message);
  // No salimos, ya que Google Auth es opcional
}

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== "production") {
  (async () => {
    await connectDB(process.env.MONGODB_URI);
    try {
      initializeS3Client();
      await verifyS3Connection();
      await createFolderStructure();
    } catch (e) {
      console.warn("⚠️ S3 init fail:", e.message);
    }

    app.listen(PORT, () => {
      console.log(`Running locally on ${PORT}`);
    });
  })();
}

export default app;  // <-- needed for Vercel
