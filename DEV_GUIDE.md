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

Proxy token and CI smoke tests
---------------------------------

You can optionally enable a small shared token to prevent anonymous use of the `proxyGemini` function.
Set it in Functions config:

```powershell
firebase functions:config:set proxy.token="SOME_SECRET"
firebase deploy --only functions
```

When enabled the proxy requires callers to set the `x-proxy-token` header with the token value.

CI smoke-test workflow
-----------------------

We've added a workflow at `.github/workflows/smoke-ci.yml` that starts the Functions emulator and runs the Node smoke test. To enable it you must add `GEMINI_API_KEY` and `PROXY_TOKEN` as repository secrets in GitHub (used only by the emulator in CI). The workflow is optional and intended for preview channel validation.

Post-deploy smoke tests
-----------------------

There's an optional `post-deploy-smoke.yml` workflow that can run the Node smoke test against your hosted site after a successful hosting deploy. To enable it, add the following repository secrets:

- `HOSTING_URL` - the base URL of your hosted site (for example `https://your-app.web.app`)
- `PROXY_TOKEN` - the proxy token if you enabled one

The workflow will call `HOSTING_URL/api/proxyGemini` and fail if the proxy does not return a successful response.

App Check verification
----------------------

The Functions proxy now verifies App Check tokens server-side using the Firebase Admin SDK when the `x-firebase-appcheck` header is present. Ensure the Admin SDK has credentials in the runtime (Cloud Functions provides these automatically). For local testing or CI emulators, set `GOOGLE_APPLICATION_CREDENTIALS` to a service account JSON if you need Admin SDK verification to succeed.
