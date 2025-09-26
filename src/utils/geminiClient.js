// Simple client helper to call the Firebase Functions Gemini proxy
// Usage: import { generateText } from '../utils/geminiClient';

const DEFAULT_PROXY = (import.meta.env && import.meta.env.VITE_GEMINI_PROXY_URL) || '/api/proxyGemini';

/**
 * Generate text using server-side Gemini proxy.
 * This function sends a request body shaped for the text-bison:generateText endpoint.
 * The server proxy forwards the body to the Gemini endpoint using the server-side key.
 *
 * @param {string} prompt - The prompt text to send to Gemini
 * @param {object} [opts] - Optional settings: { temperature, maxOutputTokens, candidateCount }
 * @returns {Promise<object|string>} - Parsed JSON response or raw text if parsing fails
 */
export async function generateText(prompt, opts = {}) {
  const endpoint = (import.meta.env && import.meta.env.VITE_GEMINI_PROXY_URL) || DEFAULT_PROXY;
  const body = {
    // shape compatible with many text-bison examples
    prompt: { text: String(prompt) },
    temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.2,
    maxOutputTokens: typeof opts.maxOutputTokens === 'number' ? opts.maxOutputTokens : 256,
    candidateCount: typeof opts.candidateCount === 'number' ? opts.candidateCount : 1
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Gemini proxy error ${res.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}
