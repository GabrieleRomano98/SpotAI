# SpotAI - Turn-Based Q&A Game

A fun multiplayer game where players take turns asking questions, and everyone else answers. Features an AI participant that joins the game, and players earn points by getting votes and identifying the AI!

---

## 🎮 Features

- **Turn-Based Gameplay**: Players rotate asking questions
- **AI Participant**: An AI automatically provides an answer to each question
- **Points System**: 
  - 1 point for each vote your answer receives
  - 2 bonus points for identifying the AI's answer
- **Real-Time**: Powered by Socket.IO for instant updates
- **Mobile Optimized**: WhatsApp-style interface
- **Leaderboard**: Live scoreboard showing player rankings

---

## 🚀 Local Development

### Install Dependencies
```bash
npm run install-all
```

### Run Development Server
```bash
npm run dev
```

This starts:
- Backend server on `http://localhost:3000`
- Frontend dev server on `http://localhost:5173`

---

## 🌐 Deployment

This project is designed to deploy on **Google Cloud Run**. 

**Dockerfile included** for easy container deployment. The app automatically:
- Builds the Vue.js frontend
- Sets up the Node.js backend
- Serves static files in production
- Listens on the port specified by `PORT` environment variable (default: 8080)

---

## 📁 Project Structure

```
spotai/
├── client/              # Vue.js frontend
│   ├── src/
│   │   ├── views/      # Home, Lobby, Game views
│   │   ├── App.vue
│   │   └── socket.js   # Socket.IO client
│   └── package.json
├── server/              # Node.js + Express backend
│   ├── index.js        # Socket.IO game logic
│   └── package.json
├── Dockerfile          # Production build configuration
├── .dockerignore
└── package.json        # Root scripts
```

---

## 🛠️ Technology Stack

- **Frontend**: Vue.js 3, Vite, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO
- **Deployment**: Docker, Google Cloud Run

---

## 🎯 How to Play

1. **Create or Join a Room**: Enter your name and create/join a game room
2. **Wait in Lobby**: Room owner starts the game when ready
3. **Ask Questions**: When it's your turn, ask a question
4. **Submit Answers**: When others ask, submit your answer
5. **Vote**: Vote for the best answer and try to identify the AI
6. **Earn Points**: Get points for votes and identifying AI answers
7. **See Results**: Check the leaderboard to see who's winning!

---

## 📝 Game Rules

- Each player takes turns being the "asker"
- All other players (including AI) submit answers
- After all answers are in, everyone votes
- You can't vote for your own answer
- Only vote once per round
- AI answers are revealed in green after voting
- Game continues with next player's turn

---

## 🔧 Configuration

### Environment Variables

- `PORT` - Server port (default: 3000, Cloud Run sets to 8080)
- `NODE_ENV` - Environment (development/production)

### Frontend Configuration

Edit `client/src/socket.js` to change Socket.IO connection if needed

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Build Fails
- Ensure Node.js 18+ is installed
- Delete `node_modules` and run `npm run install-all` again
- Check for syntax errors in console

### Connection Issues
- Verify server is running on port 3000
- Check browser console for Socket.IO errors
- Ensure no firewall blocking WebSocket connections

---

## 📄 License

MIT

---

## 👤 Author

Gabriele Romano

---

**Repository**: https://github.com/GabrieleRomano98/SpotAI  
**Deployed**: (URL will be set after Cloud Run deployment)

2. **Join a Room**:
   - Click on a shared link (will auto-fill the room code) OR
   - Enter your name and the room code manually
   - Click "Join Room"
   - You'll enter the lobby

3. **Lobby (Owner)**:
   - Wait for other players to join
   - Kick players if needed
   - Click "Start Game" when ready (minimum 2 players)

4. **Lobby (Other Players)**:
   - Wait for the owner to start the game
   - See all players in the room

5. **Playing the Game**:
   - The first player starts by asking a question
   - All other players write and submit their answers
   - Once everyone has answered, all answers are revealed
   - The turn moves to the next player
   - Continue taking turns!

## Game Flow

```
Home Screen → Lobby (wait for players) → Game (turn-based Q&A)
```

1. **Home**: Create or join a room
2. **Lobby**: Owner manages players and starts game
3. **Game**: Turn-based question and answer gameplay

## Technologies Used

### Frontend
- **Vue.js 3** - Progressive JavaScript framework
- **Vue Router** - Official router for Vue.js
- **Socket.IO Client** - Real-time bidirectional event-based communication
- **Vite** - Fast build tool and dev server

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **Socket.IO** - Real-time communication library
- **UUID** - Unique identifier generation

## API Events (Socket.IO)

### Client → Server
- `createRoom(userName)` - Create a new room
- `joinRoom({ roomCode, userName })` - Join existing room
- `kickPlayer({ roomCode, userId })` - Kick a player (owner only)
- `startGame({ roomCode })` - Start the game (owner only)
- `submitQuestion({ roomCode, question })` - Submit a question
- `submitAnswer({ roomCode, answer })` - Submit an answer
- `getLobbyState(roomCode)` - Get current lobby state
- `getGameState(roomCode)` - Get current game state

### Server → Client
- `roomCreated({ roomCode, room })` - Room successfully created
- `roomJoined({ roomCode, room })` - Successfully joined room
- `userJoined({ user, room })` - Another user joined
- `userLeft({ user, room })` - User left the room
- `playerKicked({ kickedUserId, kickedUserName, room })` - Player was kicked
- `gameStarted({ room })` - Game has started, transition to game view
- `lobbyState(room)` - Current lobby state
- `gameState(room)` - Current game state
- `questionReceived({ question, askedBy, room })` - New question posted
- `answerSubmitted({ submittedCount, totalExpected, room })` - Answer submitted
- `allAnswersReceived({ question, answers, nextTurn, room })` - All answers in
- `error({ message })` - Error occurred

## Future Enhancements

- [ ] Persist rooms to a database
- [ ] Add user authentication
- [ ] Implement voting/rating system for answers
- [ ] Add time limits for answering
- [ ] Support for multimedia (images, GIFs)
- [ ] Private messaging
- [ ] Room settings (max players, custom turn order)
- [ ] Mobile responsive improvements

