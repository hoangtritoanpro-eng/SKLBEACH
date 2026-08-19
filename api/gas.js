export default async function handler(req, res) {
  // CORS headers just in case
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const gasUrl = process.env.VITE_GAS_URL;
  if (!gasUrl) {
    return res.status(500).json({ ok: false, error: 'Missing VITE_GAS_URL on Vercel' });
  }

  try {
    // Forward the exact body string to GAS
    const bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    
    // fetch will automatically follow the 302 redirect from Google
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: bodyString
    });
    
    const text = await response.text();
    res.status(200).send(text);
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Proxy Fetch Error: ' + error.message });
  }
}
