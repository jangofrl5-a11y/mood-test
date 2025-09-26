# Security and Monitoring

This document summarizes recommended security practices when using the Gemini proxy and Firebase Functions.

## Minimum recommendations

- Keep your Gemini API key only in server-side configuration (Firebase Functions config or environment variables).
- Do not expose the key in client bundles (avoid VITE_ prefixed production envs).
- Add a small proxy token (`proxy.token`) to Functions config to reduce anonymous abuse.

## App Check

- Use Firebase App Check to ensure only your app instances can call the function.
- Register the app in the Firebase console and enable App Check providers (Play Integrity, DeviceCheck, reCAPTCHA v3, or custom).
- Note: true App Check enforcement should be enabled in the Firebase console and verified server-side with the Admin SDK. This repo includes an optional header check; adapt to your security needs.

## Monitoring & Logging

- Use Cloud Logging to capture errors and request metadata (do not log secrets).
- Alert on error-rate increases and large usage spikes.
- Consider per-user quota enforcement and rate limiting inside the function.

## Key rotation & incident response

1. Invalidate the compromised key at the provider console.
2. Create a new Gemini API key.
3. Update Functions config and redeploy:
   ```powershell
   firebase functions:config:set gemini.key="NEW_KEY"
   firebase deploy --only functions
   ```
4. Rotate any repository secrets referencing the key and update CI secrets.

## Cost control

- Limit `maxOutputTokens` and `candidateCount` in the frontend or server-side to avoid accidental high-cost requests.
- Consider request size limits and per-user throttles.
