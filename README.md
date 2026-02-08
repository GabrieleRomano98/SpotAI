# SpotAI

Real-time multiplayer Q&A game where players take turns asking questions, and an AI participant plays alongside humans.

## Quick Start

```bash
# Install dependencies
npm run install-all

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

## Project Structure

```
spotai/
├── client/         # Vue.js frontend
├── server/         # Express + Socket.IO backend
└── Dockerfile      # Production container config
```

## Tech Stack

- **Frontend**: Vue.js 3, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO
- **Deployment**: Docker, Cloud Run

## License

MIT
