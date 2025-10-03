// Gemini client removed — no-op helper
// If you want to re-add a server-side text generation endpoint, implement it
// on a server you control and call it from the frontend.

export async function generateText(prompt) {
  console.warn('generateText: Gemini integration removed.');
  return { text: 'Gemini integration removed from this repository.' };
}
