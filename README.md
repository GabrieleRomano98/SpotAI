# SpotAI

Real-time multiplayer Q&A game where players take turns asking questions, and an AI participant plays alongside humans.

## Quick Start

```bash
# Install dependencies
npm run install-all

# Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY from https://aistudio.google.com/app/apikey

# Run development server
npm run dev
```

Visit `http://localhost:5173` to play locally.

## How to Play

1. Create or join a room with a 6-digit code
2. Wait in the lobby for other players
3. Take turns asking questions
4. Submit answers when it's not your turn
5. Vote for the best answer and try to identify the AI
6. Earn points: 1 per vote received, 2 bonus for identifying AI

## Deployment

Built for Google Cloud Run. The Dockerfile handles the complete build and deployment process.

### Requirements
- Node.js 18+
- Docker (for building)

### Environment Variables
- `NODE_ENV=production` - Required for production mode
- `PORT` - Server port (Cloud Run sets this automatically)
- `GEMINI_API_KEY` - Google Gemini API key for AI responses (get from https://aistudio.google.com/app/apikey)
- `SESSION_SECRET` - Secret key for session encryption (recommended for production)

## Project Structure

```
spotai/
├── client/         # Vue.js frontend
│   └── src/
│       ├── api.js       # REST API client with Server-Sent Events
│       └── views/       # Vue components
├── server/         # Express REST API backend
│   └── index.js         # Main server file
└── Dockerfile      # Production container config
```

## Tech Stack

- **Frontend**: Vue.js 3, REST API with Server-Sent Events (SSE)
- **Backend**: Node.js, Express, Express-Session, Server-Sent Events
- **AI**: Google Gemini API
- **Deployment**: Docker, Google Cloud Run
- **Real-time**: Server-Sent Events (SSE) for instant updates

## Architecture

SpotAI uses a **session-based REST API** with **Server-Sent Events (SSE)** for real-time updates:

- **Sessions**: Cookie-based user sessions with `express-session`
- **REST Endpoints**: Standard HTTP POST/GET for game actions
- **SSE**: Unidirectional real-time updates from server to clients
- **Broadcast System**: Server broadcasts events to all players in a room

### Key Features
- ✅ No Socket.IO dependency
- ✅ Instant real-time updates via SSE
- ✅ Session-based authentication
- ✅ Horizontal scaling ready (with Redis session store)
- ✅ Standard HTTP/HTTPS compatible

## License

MIT
