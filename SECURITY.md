# Security and Monitoring

This file contains general security recommendations for this project. The repository does not include a built-in server-side proxy; if you add one, follow these guidelines.

## Minimum recommendations

- Keep secrets (API keys, service-account JSON) only on the server and out of source control.
- Do not expose sensitive keys in client bundles or Vite env variables that are published to the browser.
- Use short-lived credentials and rotate keys regularly.

## Monitoring & Logging

- Capture errors and request metadata in your server-side logs, but never log secrets.
- Alert on error-rate increases and unusual traffic spikes.

## Key rotation & incident response

1. Revoke the compromised credential at the provider console.
2. Create a new credential and update the server-side configuration.
3. Rotate any repository or CI secrets that reference the key.

## Cost control

- Limit request sizes and outputs when calling paid APIs.
- Consider rate limiting or per-user quotas on server endpoints.
