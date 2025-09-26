const functions = require('firebase-functions');
const fetch = require('node-fetch');

// Read key from functions config or environment
const KEY = (functions.config() && functions.config().gemini && functions.config().gemini.key) || process.env.GEMINI_API_KEY;

// Optional simple proxy token to prevent unsolicited use of the function.
// Set via `firebase functions:config:set proxy.token="SOME_SECRET"` or the env var PROXY_TOKEN / FUNCTIONS_PROXY_TOKEN.
const PROXY_TOKEN = (functions.config() && functions.config().proxy && functions.config().proxy.token) || process.env.FUNCTIONS_PROXY_TOKEN || process.env.PROXY_TOKEN;

if (!KEY) {
  console.warn('Warning: Gemini key not found in functions.config().gemini.key or process.env.GEMINI_API_KEY');
}

if (PROXY_TOKEN) {
  console.log('Proxy token enforcement enabled');
}

// Minimal proxy: accepts POST /proxy and forwards to the Gemini endpoint
exports.proxyGemini = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  if (!KEY) return res.status(500).send('Server misconfiguration: Gemini key missing');

  // If a proxy token is configured, require the caller to provide it in the x-proxy-token header.
  if (PROXY_TOKEN) {
    const provided = req.get('x-proxy-token') || '';
    if (!provided || provided !== PROXY_TOKEN) {
      return res.status(401).send('Unauthorized: invalid proxy token');
    }
  }

  try {
    const body = req.body || {};

    // Example endpoint - replace with the actual Gemini API endpoint you intend to use
    const endpoint = 'https://gemini.googleapis.com/v1/models/text-bison:generateText';

    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KEY}`
      },
      body: JSON.stringify(body)
    });

    const data = await r.text();
    res.status(r.status).send(data);
  } catch (err) {
    console.error('proxy error', err);
    res.status(500).send('proxy error');
  }
});
