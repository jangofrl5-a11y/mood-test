#!/usr/bin/env node
// Simple smoke test for the deployed proxy endpoint
// Usage: node scripts/smoke_test_proxy.js https://.../api/proxyGemini

const fetch = require('node-fetch');

async function main() {
  const url = process.argv[2] || 'http://localhost:5001/YOUR_PROJECT/us-central1/proxyGemini';
  console.log('Testing proxy at', url);

  const body = {
    prompt: { text: 'Say hello in a friendly tone' },
    temperature: 0.2,
    maxOutputTokens: 64
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    console.log('Status:', res.status);
    try {
      console.log('JSON:', JSON.parse(text));
    } catch (e) {
      console.log('Raw response:', text);
    }
  } catch (err) {
    console.error('Request error', err);
    process.exit(2);
  }
}

main();
