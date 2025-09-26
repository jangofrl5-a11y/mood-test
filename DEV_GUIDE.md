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
