Developer setup notes

If you see Windows EPERM errors during install (operation not permitted, unlink ... esbuild.exe or rollup.*.node), it's usually because a running process has a handle open on a native binary inside node_modules.

Quick safe sequence (PowerShell):

1) Stop background node/esbuild processes, remove node_modules and lockfile, then reinstall:

Stop-Process -Name node,esbuild -ErrorAction SilentlyContinue; Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue; npm install

2) There's an npm script to automate that from the repo root:

npm run clean-install

Notes:
- Close running dev servers and editor-integrated terminals before running clean installs.
- If you still hit file locks, check antivirus or Windows file indexing and temporarily exclude the project directory.
- Use `npm ci` in CI after `package-lock.json` is present for deterministic installs.

### Using the server-side Gemini proxy

We provide a small frontend helper at `src/utils/geminiClient.js` which POSTs to the Functions proxy endpoint (`/api/proxyGemini` by default). The repo's `firebase.json` includes a rewrite so this path is routed to the `proxyGemini` function.

Minimal example:

```js
import { generateText } from '../utils/geminiClient';

async function askGemini() {
	const res = await generateText('Write a friendly reminder to pray on time', { temperature: 0.2 });
	console.log(res);
}
```

Notes:
- Do NOT keep your Gemini API key in `.env.local` as `VITE_GEMINI_KEY` for production — this exposes the key to the client bundle. Use the server proxy instead.
- If you need a local-only key for experimentation, keep it out of commits and delete it before pushing or switch to using the Functions emulator with a local secret.
