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

  return res.status(200).json({
    message: 'CSI Discord Bot - Vercel Deployment',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      discord: '/api/discord',
      health: '/api/health'
    }
  });
}
