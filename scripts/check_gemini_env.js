#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readEnvFile(filePath) {
  try {
    const src = fs.readFileSync(filePath, 'utf8');
    const lines = src.split(/\r?\n/);
    const map = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const k = trimmed.slice(0, idx);
      const v = trimmed.slice(idx + 1);
      map[k] = v;
    }
    return map;
  } catch (err) {
    return {};
  }
}

function maskKey(k) {
  if (!k) return '';
  if (k.length <= 10) return k.replace(/./g, '*');
  return k.slice(0, 6) + '...' + k.slice(-4);
}

function main() {
  // Prefer process.env first
  let key = process.env.VITE_GEMINI_KEY || process.env.GEMINI_API_KEY || '';

  if (!key) {
    // Look for .env.local or .env in repo root
    const candidates = [path.resolve('.env.local'), path.resolve('.env')];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const envs = readEnvFile(p);
        key = key || envs['VITE_GEMINI_KEY'] || envs['GEMINI_API_KEY'] || '';
      }
    }
  }

  if (key) {
    console.log('✅ Gemini key found.');
    console.log('Masked value:', maskKey(key));
    process.exit(0);
  } else {
    console.error('❌ No Gemini key found.');
    console.error('Set one locally in `.env.local` as VITE_GEMINI_KEY or add GEMINI_API_KEY as a GitHub secret.');
    process.exit(2);
  }
}

main();
