// Vercel serverless function for health check
export default async function handler(req, res) {
  console.log('Health API called:', req.method);
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: 'vercel',
    message: 'Air Assist API is running on Vercel'
  });
}
