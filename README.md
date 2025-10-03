# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).
# mood-test

Minimal Vite + React app used for experimenting with a small journaling UI.

Basic scripts:

- npm run dev — start the Vite dev server
- npm run build — build the production bundle
- npm run preview — preview the built bundle locally

This repository has had Firebase and a server-side LLM proxy previously added, but those artifacts were removed. No Firebase Hosting or Functions configuration remains in this repo.

If you need server-side secret handling (for an LLM API key or similar), add a small backend or serverless function on your chosen platform and keep secrets out of source control.


