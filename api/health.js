const mongoose = require('mongoose');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check MongoDB connection
  let dbStatus = 'disconnected';
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI, {});
    }
    dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  } catch (error) {
    console.error('Database connection error:', error);
    dbStatus = 'error';
  }

  return res.status(200).json({
    status: 'healthy',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform
    }
  });
}
