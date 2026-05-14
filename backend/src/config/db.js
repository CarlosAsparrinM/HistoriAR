import mongoose from 'mongoose';

let isConnected = false;

/**
 * Connects to MongoDB if not already connected.
 * @param {string} uri - The MongoDB URI
 * @returns {Promise<void>}
 */
export async function connectDB(uri) {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri || process.env.MONGODB_URI, { dbName: 'historiar' });
    isConnected = true;
    console.log('✅ MongoDB Atlas conectado');
  } catch (err) {
    console.error('❌ Error conectando a MongoDB:', err.message);
    // Only exit if not in a serverless environment or if explicitly required
    if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
      process.exit(1);
    }
    throw err;
  }
}
