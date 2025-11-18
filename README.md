# Music Room

A real-time collaborative music listening room built with React, TypeScript, Vite, and Supabase Realtime.

## Features

- 🎵 Create or join music rooms
- 🔄 Real-time synchronization across all participants
- 🎬 YouTube video playback
- 📋 Shared queue management
- 👥 Live member presence tracking
- 🎮 Play/pause controls synchronized for everyone

## Setup

### Prerequisites

- Node.js (v18 or higher)
- A Supabase account (free tier works)
- YouTube Data API v3 key

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd music-room
npm install
```

### 2. Configure Supabase

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Once your project is ready, go to **Settings** > **API**
3. Copy your **Project URL** and **anon/public key**

### 3. Get YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**
4. Create credentials (API Key)
5. Copy your API key

### 4. Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_YOUTUBE_API_KEY=your_youtube_api_key_here
```

### 5. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Deployment (Vercel)

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add the environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_YOUTUBE_API_KEY`
4. Deploy!

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Realtime**: Supabase Realtime (Broadcast + Presence)
- **Video**: YouTube IFrame API
- **UI**: Radix UI + Tailwind CSS
- **Deployment**: Vercel-ready (serverless)

## Migration from WebSocket

This project was migrated from a custom WebSocket server to Supabase Realtime for better scalability and Vercel compatibility. See [SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md) for details.

---

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

## WebSocket Server Architecture

This project uses a WebSocket server as the single source of truth for room state, enabling real-time synchronization across devices. The server manages rooms in memory and handles all state updates (members, queue, current video, playing status).

Files:

- `server/ws-server.js` — Node.js WebSocket server (in-memory room state)
- `server/package.json` — Server dependencies
- `server/Dockerfile` — Container image build
- `Procfile` — Heroku deployment

Server Features:

- Maintains authoritative room state
- Handles member presence/cleanup
- Manages video playback sync
- Supports queue operations
- Real-time state broadcast

Environment Setup:

- Frontend connects via `VITE_WS_URL` (in `.env`)
- Default local URL: `ws://localhost:3001`
- Use `wss://` for secure production deploys

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
