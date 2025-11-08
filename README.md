# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

## Realtime WebSocket server (rooms across devices)

This project includes a minimal WebSocket relay server that lets multiple clients share room state (members, queue, current video, playing) across browsers and devices.

Files:

- `server/ws-server.js` — the Node `ws` server implementation (in-memory rooms)
- `server/package.json` — minimal package.json for the server
- `server/Dockerfile` — Dockerfile to build the server image (for Cloud Run / containers)
- `Procfile` — for Heroku deployment

Environment / client config:

- The frontend connects to the server URL from `VITE_WS_URL` (set in `.env`), defaulting to `ws://localhost:3001` for local development.

Local development

1. Install dependencies:

```bash
npm install
```

2. Start the WebSocket server (local):

```bash
npm run ws-server
```

3. Start the frontend in another terminal:

```bash
npm run dev
```

Deploying the WebSocket server

Heroku

- Add the repo to Heroku and set the buildpack to Node.js (Heroku will use the root `package.json`). The `Procfile` included runs `node server/ws-server.js`.
- Set the `PORT` environment variable (Heroku sets this automatically).

Render

- Create a new Web Service on Render.
- Connect your GitHub repo, choose the `server` folder as the root (or use the root with start command `node server/ws-server.js`).
- Set the start command to `node server/ws-server.js` and set the port to the default Render port (Render uses `PORT`).

Vercel

- Vercel's serverless functions are not ideal for persistent WebSocket servers. You can still deploy a WebSocket server on Vercel using Edge or external WebSocket providers, but for simplicity use Render, Heroku, or Cloud Run.

Cloud Run (Docker)

- Build and push the Docker image:

```bash
docker build -t gcr.io/<PROJECT-ID>/music-room-ws:latest -f server/Dockerfile server
docker push gcr.io/<PROJECT-ID>/music-room-ws:latest
```

- Deploy to Cloud Run pointing to the pushed image and allow unauthenticated invocations. Cloud Run will set the `PORT` environment variable automatically.

Client configuration after deploy

- Set `VITE_WS_URL` in your frontend environment (for example in `.env`) to `wss://<YOUR-SERVER-URL>`.
- Rebuild/redeploy the frontend so Vite picks up the new env variable.

Notes & next steps

- The server stores rooms in memory; restarting the server clears rooms. For production, add persistence (Redis) or use managed realtime DBs (Supabase, Firebase).
- The server trusts clients; add validation/auth if needed.
