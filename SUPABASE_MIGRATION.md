# Migrating to Supabase Realtime

This document explains the migration from WebSocket server to Supabase Realtime.

## Setup Steps

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project (free tier is sufficient)
3. Wait for the project to finish setting up

### 2. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** > **API**
2. Copy your **Project URL** (looks like `https://xxxxx.supabase.co`)
3. Copy your **anon/public key** (a long JWT token)

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_YOUTUBE_API_KEY=your_youtube_api_key_here
```

For Vercel deployment, add these as environment variables in your project settings.

### 4. Enable Realtime

In your Supabase dashboard:

1. Go to **Database** > **Replication**
2. Make sure Realtime is enabled (it should be by default)

### 5. Install Dependencies

```bash
npm install
```

### 6. Run the App

```bash
npm run dev
```

## How It Works

### Supabase Realtime Channels

Instead of a WebSocket server, we now use Supabase Realtime channels:

- Each room creates a channel: `room:{roomId}`
- **Presence tracking** handles member join/leave
- **Broadcast** messages sync room state (video, queue, play/pause)

### Key Differences from WebSocket

| WebSocket Server        | Supabase Realtime      |
| ----------------------- | ---------------------- |
| Custom ws-server.js     | Managed service        |
| Manual state management | Built-in presence      |
| Needs separate deploy   | Included with Supabase |
| ws:// or wss:// URL     | HTTPS API              |

### Room State Management

The app uses a **client-side state coordination** model:

1. One client (usually the one who triggers an action) broadcasts state changes
2. All clients (including sender) receive the broadcast
3. Each client updates their local state

This works well for small groups and eliminates the need for server-side state storage.

## Deploying to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_YOUTUBE_API_KEY`
4. Deploy!

The app will now work entirely serverless on Vercel.

## Limitations

- Supabase free tier: 200 concurrent connections, 2GB database
- Realtime messages: Limited to 250KB per message
- Presence: Max 200 users per channel

For this music room app, these limits are more than sufficient.

## Troubleshooting

**Issue**: "Cannot connect to room"

- Check your Supabase URL and anon key are correct
- Verify Realtime is enabled in Supabase dashboard

**Issue**: "Members not showing up"

- Refresh the page
- Check browser console for errors
- Verify Supabase project is active

**Issue**: "State not syncing"

- Check network tab for Realtime connection
- Ensure all clients are using the same Supabase project
