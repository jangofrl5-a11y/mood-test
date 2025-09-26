# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Build & deploy

Build the production bundle:

```powershell
npm run build
```

Preview the built site locally:

```powershell
npm run preview
```

### Firebase Hosting

1. Install Firebase CLI if you don't have it:

```powershell
npm install -g firebase-tools
```

2. Log in and initialize hosting if needed:

```powershell
firebase login
firebase init hosting
# When asked for the public directory, enter: dist
# Configure as single-page app: yes
```

3. Build and deploy:

```powershell
npm run build
firebase deploy --only hosting
```

### GitHub Actions (CI)

You can add a GitHub Actions workflow to build and deploy on push to `main`. The repository is configured to use a service-account JSON secret named `FIREBASE_SERVICE_ACCOUNT` by default (recommended). Alternatively you can use a CI token named `FIREBASE_TOKEN`.

Create `.github/workflows/deploy.yml` with a recommended workflow that authenticates with a service-account JSON secret and deploys the Vite build:

```yaml
name: Build and Deploy

on:
	push:
		branches: [ main ]

jobs:
	build-and-deploy:
		runs-on: ubuntu-latest
		steps:
			- uses: actions/checkout@v3
			- name: Use Node.js
				uses: actions/setup-node@v3
				with:
					node-version: '18'
			- name: Install dependencies
				run: npm ci
			- name: Build
				run: npm run build
			- name: Authenticate to GCP
				uses: google-github-actions/auth@v1
				with:
					credentials_json: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
			- name: Deploy to Firebase
				uses: w9jds/firebase-action@v2.2.0
				with:
					args: deploy --only hosting
				env:
					GOOGLE_APPLICATION_CREDENTIALS: ${{ github.workspace }}/firebase_key.json
```

If you'd like, I can add the workflow file to the repository now.

## Using a Firebase service account in GitHub Actions

The workflow in `.github/workflows/deploy.yml` expects a repository secret named `FIREBASE_SERVICE_ACCOUNT` containing the JSON service account key. Steps to create and add it:

1. Create a service account in Google Cloud Console
	- Open https://console.cloud.google.com/iam-admin/serviceaccounts
	- Create a new service account (e.g. `github-deploy`) and grant it the **Firebase Hosting Admin** role (or at least the minimal hosting deploy permissions).
	- Create a JSON key for that service account and download it (this is the file `key.json`).

2. Add the key as a GitHub repository secret
	- In the GitHub repository go to Settings → Secrets → Actions → New repository secret.
	- Name: `FIREBASE_SERVICE_ACCOUNT`
	- Value: open the `key.json` file and paste the entire JSON contents into the secret value field.

Alternatively, using the GitHub CLI on Windows PowerShell:

```powershell
# from the repository root
gh secret set FIREBASE_SERVICE_ACCOUNT --body "$(Get-Content key.json -Raw)"
```

3. The workflow will receive the secret and the `FirebaseExtended/action-hosting-deploy` action will use it to authenticate.

Alternative: use a CI token instead of a service account

If you prefer a token-based approach (simpler but less fine-grained), you can use `FIREBASE_TOKEN`:

```powershell
npm i -g firebase-tools
firebase login:ci
# copy the printed token and add it as a GitHub secret named FIREBASE_TOKEN
gh secret set FIREBASE_TOKEN --body "<PASTE_TOKEN_HERE>"
```

If you switch to the token method, update the workflow to call `firebase deploy --token "$FIREBASE_TOKEN"` instead of using the service-account action.

### Quick copy-paste snippets

Set `FIREBASE_SERVICE_ACCOUNT` using GitHub CLI (PowerShell):

```powershell
gh secret set FIREBASE_SERVICE_ACCOUNT --body "$(Get-Content key.json -Raw)"
```

Set `FIREBASE_TOKEN` (token method):

```powershell
npm i -g firebase-tools
firebase login:ci
# copy the token printed by the command, then:
gh secret set FIREBASE_TOKEN --body "<PASTE_TOKEN_HERE>"
```

Minimal workflow snippet using service-account (action):

```yaml
- name: Deploy to Firebase
	uses: FirebaseExtended/action-hosting-deploy@v0
	with:
		repoToken: '${{ secrets.GITHUB_TOKEN }}'
		firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
		channelId: live
```

Minimal workflow snippet using token (shell deploy):

```yaml
- name: Deploy to Firebase
  run: |
    npm install -g firebase-tools
	firebase deploy --only hosting --token "${{ secrets.FIREBASE_TOKEN }}"
```


## Local environment variables

For local development you can keep secrets out of source control by creating a `.env.local` file at the project root. A safe example is provided in `.env.local.example`. Copy it and add your real API keys locally:

```powershell
# from the repository root
cp .env.local.example .env.local
# then edit .env.local and replace the placeholder with your real key
```

Important: Do NOT commit `.env.local` or your real API keys to the repository. Use GitHub Actions secrets for CI.

## Server-side proxy (recommended)

To avoid exposing the Gemini API key in client bundles, the repository includes a minimal Firebase Functions proxy under `functions/` which forwards requests to the Gemini endpoint using a server-side key.

Setup and deploy the function:

1. Ensure Firebase Functions are enabled for your project (Firebase Console → Functions) and you have `firebase-tools` installed.

2. Set the Gemini key in Functions config (runs on your machine, not committed):

```powershell
# replace NEW_KEY_HERE with the real key
firebase functions:config:set gemini.key="NEW_KEY_HERE"

# deploy the functions folder
firebase deploy --only functions
```

3. The function exposes an HTTPS endpoint `proxyGemini` which your frontend can call (POST). It will forward the request to the Gemini endpoint using the server-side key.

Security note: Restrict the function (IAM or App Check) as appropriate and only expose the minimal endpoints you need. Do not log or return full secrets.


