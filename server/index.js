const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

const corsOptions = {
  origin: isProduction 
    ? [process.env.FRONTEND_URL || "*"] 
    : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'spotai-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false,
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files in production
if (isProduction) {
  app.use(express.static(path.join(__dirname, 'public')));
}

const rooms = new Map();

const sseConnections = new Map();

function broadcastToRoom(roomCode, event, data) {
  const connections = sseConnections.get(roomCode);
  if (connections) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    connections.forEach(res => {
      try {
        res.write(message);
      } catch (err) {
        console.error('Error broadcasting to client:', err);
      }
    });
  }
}

async function getAIAnswer(question) {
  try {
    console.log('[AI] Generating answer for question:', question);
    
    const prompt = `
      You are playing a fun Q&A game with humans.
      Answer this question in a casual, human-like way (1-2 sentences max).
      Be creative and sometimes humorous, but keep it natural so you blend in with real players.
      Try to be short as the message has to be displayed.
      Give me directly the answer without any introduction or comment, humans shouldn't be able to identify it 

      Question: ${question}

      Answer:`;

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('API timeout')), 10000)
    );

    const apiPromise = model.generateContent(prompt);
    const result = await Promise.race([apiPromise, timeoutPromise]);
    const response = await result.response;
    const answer = response.text().trim();
    
    console.log('[AI] Generated answer:', answer);
    return answer;
  } catch (error) {
    console.error('[AI ERROR]:', error.message);
    
    const fallbacks = [
      "Not sure about that one!",
      "I'll pass on this one.",
      "Let me think... pass!",
      "Hmm, tough question!",
      "I don't know honestly."
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

// Helper functions
function sanitizeLobbyRoom(room) {
  return {
    id: room.id,
    code: room.code,
    ownerId: room.ownerId,
    users: room.users.map(u => ({ id: u.id, name: u.name, points: u.points || 0 })),
    status: room.status
  };
}

function sanitizeGameRoom(room) {
  return {
    id: room.id,
    code: room.code,
    ownerId: room.ownerId,
    users: room.users.map(u => ({ id: u.id, name: u.name, points: u.points || 0 })),
    status: room.status,
    currentTurn: room.currentTurn,
    currentQuestion: room.currentQuestion,
    answers: room.answers,
    answersCount: room.answers.length,
    totalAnswersExpected: room.users.length,
    roundHistory: room.roundHistory,
    phase: room.phase,
    votedCount: room.votedUsers ? room.votedUsers.size : 0,
    totalVotesExpected: room.users.length
  };
}

// API Routes

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/rooms/create', (req, res) => {
  const { userName } = req.body;
  
  if (!userName) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const roomId = uuidv4();
  const userId = uuidv4();
  
  const room = {
    id: roomId,
    code: roomCode,
    ownerId: userId,
    users: [{
      id: userId,
      name: userName,
      points: 0,
      lastSeen: Date.now()
    }],
    status: 'lobby',
    currentTurn: 0,
    currentQuestion: null,
    answers: [],
    roundHistory: [],
    phase: 'asking',
    votedUsers: new Set()
  };
  
  rooms.set(roomCode, room);
  
  req.session.userId = userId;
  req.session.userName = userName;
  req.session.roomCode = roomCode;
  
  console.log(`Room created: ${roomCode} by ${userName}`);
  
  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).json({ error: 'Failed to save session' });
    }
    
    res.json({
      roomCode,
      userId,
      room: sanitizeLobbyRoom(room)
    });
  });
});

// Join room
app.post('/api/rooms/join', (req, res) => {
  const { roomCode, userName } = req.body;
  
  if (!roomCode || !userName) {
    return res.status(400).json({ error: 'Room code and username are required' });
  }
  
  const room = rooms.get(roomCode);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  if (room.status === 'playing') {
    return res.status(400).json({ error: 'Game already in progress' });
  }
  
  const existingUser = room.users.find(u => u.name === userName);
  if (existingUser) {
    return res.status(400).json({ error: 'Username already taken in this room' });
  }
  
  const userId = uuidv4();
  const newUser = {
    id: userId,
    name: userName,
    points: 0,
    lastSeen: Date.now()
  };
  
  room.users.push(newUser);
  
  req.session.userId = userId;
  req.session.userName = userName;
  req.session.roomCode = roomCode;
  
  console.log(`User ${userName} joined room: ${roomCode}`);
  
  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).json({ error: 'Failed to save session' });
    }
    
    res.json({
      userId,
      room: sanitizeLobbyRoom(room)
    });
    
    broadcastToRoom(roomCode, 'userJoined', {
      userName,
      room: sanitizeLobbyRoom(room)
    });
  });
});

// Server-Sent Events endpoint for real-time updates
app.get('/api/rooms/:roomCode/events', (req, res) => {
  const { roomCode } = req.params;
  const room = rooms.get(roomCode);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  
  if (!sseConnections.has(roomCode)) {
    sseConnections.set(roomCode, new Set());
  }
  sseConnections.get(roomCode).add(res);
  
  res.write(`event: connected\ndata: ${JSON.stringify({ roomCode })}\n\n`);
  
  const roomData = room.status === 'lobby' ? sanitizeLobbyRoom(room) : sanitizeGameRoom(room);
  res.write(`event: roomState\ndata: ${JSON.stringify(roomData)}\n\n`);
  
  req.on('close', () => {
    const connections = sseConnections.get(roomCode);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        sseConnections.delete(roomCode);
      }
    }
  });
});

// Get room state
app.get('/api/rooms/:roomCode', (req, res) => {
  const { roomCode } = req.params;
  const room = rooms.get(roomCode);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  const userId = req.session.userId;
  if (userId) {
    const user = room.users.find(u => u.id === userId);
    if (user) {
      user.lastSeen = Date.now();
    }
  }
  
  const now = Date.now();
  const timeout = 30000; // 30 seconds
  room.users = room.users.filter(u => now - u.lastSeen < timeout);
  
  if (room.users.length === 0) {
    rooms.delete(roomCode);
    return res.status(404).json({ error: 'Room deleted (empty)' });
  }
  
  const roomData = room.status === 'lobby' ? sanitizeLobbyRoom(room) : sanitizeGameRoom(room);
  res.json(roomData);
});

// Kick player
app.post('/api/rooms/:roomCode/kick', (req, res) => {
  const { roomCode } = req.params;
  const { userId: targetUserId } = req.body;
  const room = rooms.get(roomCode);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  const requesterId = req.session.userId;
  if (requesterId !== room.ownerId) {
    return res.status(403).json({ error: 'Only the owner can kick players' });
  }
  
  const userIndex = room.users.findIndex(u => u.id === targetUserId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const kickedUser = room.users[userIndex];
  room.users.splice(userIndex, 1);
  
  console.log(`User ${kickedUser.name} kicked from room: ${roomCode}`);
  
  res.json({ 
    success: true,
    room: sanitizeLobbyRoom(room)
  });
});

// Start game
app.post('/api/rooms/:roomCode/start', (req, res) => {
  const { roomCode } = req.params;
  const room = rooms.get(roomCode);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  const requesterId = req.session.userId;
  
  if (requesterId !== room.ownerId) {
    return res.status(403).json({ error: 'Only the owner can start the game' });
  }
  
  if (room.users.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 players to start' });
  }
  
  room.status = 'playing';
  room.currentTurn = 0;
  room.phase = 'asking';
  room.votedUsers = new Set();
  
  console.log(`Game started in room: ${roomCode}`);
  
  const gameRoom = sanitizeGameRoom(room);
  
  broadcastToRoom(roomCode, 'gameStarted', { room: gameRoom });
  
  res.json({ 
    success: true,
    room: gameRoom
  });
});

// Submit question
app.post('/api/rooms/:roomCode/question', async (req, res) => {
  const { roomCode } = req.params;
  const { question } = req.body;
  const room = rooms.get(roomCode);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  const userId = req.session.userId;
  const user = room.users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(403).json({ error: 'User not in room' });
  }
  
  if (room.users[room.currentTurn].id !== userId) {
    return res.status(403).json({ error: 'Not your turn' });
  }
  
  room.currentQuestion = question;
  room.answers = [];
  room.phase = 'answering';
  
  const gameRoom = sanitizeGameRoom(room);
  
  broadcastToRoom(roomCode, 'questionReceived', {
    question,
    currentTurn: user.name,
    room: gameRoom
  });
  
  res.json({
    success: true,
    room: gameRoom
  });
  
  (async () => {
    try {
      const aiAnswer = await getAIAnswer(question);
      room.answers.push({
        userId: 'AI',
        userName: 'AI',
        answer: aiAnswer,
        votes: [],
        isAI: true
      });
      
      console.log(`AI answer added to room ${roomCode}: ${aiAnswer}`);
      
      room.answersCount = room.answers.length;
      
      const updatedGameRoom = sanitizeGameRoom(room);
      broadcastToRoom(roomCode, 'answerSubmitted', {
        userName: 'AI',
        room: updatedGameRoom
      });
      
      const expectedAnswers = room.users.length;
      if (room.answersCount >= expectedAnswers) {
        room.phase = 'voting';
        room.votedCount = 0;
        room.totalVotesExpected = room.users.length - 1;
        
        const votingRoom = sanitizeGameRoom(room);
        broadcastToRoom(roomCode, 'votingPhase', {
          room: votingRoom
        });
        
        console.log(`Room ${roomCode} entering voting phase`);
      }
    } catch (error) {
      console.error(`Error generating AI answer for room ${roomCode}:`, error);
    }
  })();
});

// Submit answer
app.post('/api/rooms/:roomCode/answer', (req, res) => {
  const { roomCode } = req.params;
  const { answer } = req.body;
  const room = rooms.get(roomCode);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  const userId = req.session.userId;
  const user = room.users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(403).json({ error: 'User not in room' });
  }
  
  if (room.users[room.currentTurn].id === userId) {
    return res.status(400).json({ error: 'You cannot answer your own question' });
  }
  
  const existingAnswer = room.answers.find(a => a.userId === userId);
  if (existingAnswer) {
    return res.status(400).json({ error: 'You already submitted an answer' });
  }
  
  room.answers.push({
    userId: user.id,
    userName: user.name,
    answer,
    votes: []
  });
  
  broadcastToRoom(roomCode, 'answerSubmitted', {
    answeredCount: room.answers.length,
    totalExpected: room.users.length,
    room: sanitizeGameRoom(room)
  });
  
  if (room.answers.length === room.users.length) {
    room.phase = 'voting';
    room.votedUsers = new Set();
    
    room.answers = room.answers.sort(() => Math.random() - 0.5);
    
    console.log(`All answers received in room ${roomCode}, entering voting phase`);
    
    const votingRoom = sanitizeGameRoom(room);
    
    broadcastToRoom(roomCode, 'votingPhase', {
      answers: room.answers,
      votedCount: 0,
      totalExpected: room.users.length,
      room: votingRoom
    });
    
    res.json({
      success: true,
      room: votingRoom
    });
  } else {
    res.json({
      success: true,
      room: sanitizeGameRoom(room)
    });
  }
});

// Vote for answer
app.post('/api/rooms/:roomCode/vote', (req, res) => {
  const { roomCode } = req.params;
  const { answerUserId } = req.body;
  const room = rooms.get(roomCode);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  const userId = req.session.userId;
  const user = room.users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(403).json({ error: 'User not in room' });
  }
  
  if (room.phase !== 'voting') {
    return res.status(400).json({ error: 'Not in voting phase' });
  }
  
  const answer = room.answers.find(a => a.userId === answerUserId);
  
  if (!answer) {
    return res.status(404).json({ error: 'Answer not found' });
  }
  
  if (answerUserId === userId) {
    return res.status(400).json({ error: 'Cannot vote for your own answer' });
  }
  
  if (!answer.votes) {
    answer.votes = [];
  }
  
  room.answers.forEach(a => {
    if (a.votes) {
      const voteIndex = a.votes.findIndex(v => v.userId === userId);
      if (voteIndex !== -1) {
        a.votes.splice(voteIndex, 1);
        room.votedUsers.delete(userId);
      }
    }
  });
  
  answer.votes.push({
    userId: user.id,
    userName: user.name
  });
  room.votedUsers.add(userId);
  
  console.log(`User ${user.name} voted for answer`);
  
  const gameRoom = sanitizeGameRoom(room);
  
  broadcastToRoom(roomCode, 'voteUpdated', {
    answers: room.answers,
    votedCount: room.votedUsers.size,
    totalExpected: room.users.length,
    room: gameRoom
  });
  
  res.json({
    success: true,
    room: gameRoom
  });
});

// Start next turn
app.post('/api/rooms/:roomCode/next-turn', (req, res) => {
  const { roomCode } = req.params;
  const room = rooms.get(roomCode);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  const userId = req.session.userId;
  
  if (room.users[room.currentTurn].id !== userId) {
    return res.status(403).json({ error: 'Only the question asker can start the next turn' });
  }
  
  room.answers.forEach(answer => {
    if (answer.votes && answer.votes.length > 0) {
      if (!answer.isAI) {
        const answerUser = room.users.find(u => u.id === answer.userId);
        if (answerUser) {
          answerUser.points += answer.votes.length;
          console.log(`Awarded ${answer.votes.length} point(s) to ${answerUser.name}`);
        }
      } else {
        answer.votes.forEach(vote => {
          const voter = room.users.find(u => u.id === vote.userId);
          if (voter) {
            voter.points += 2;
            console.log(`Awarded 2 bonus points to ${voter.name} for identifying AI answer`);
          }
        });
      }
    }
  });
  
  room.roundHistory.push({
    question: room.currentQuestion,
    askedBy: room.users[room.currentTurn].name,
    answers: [...room.answers]
  });
  
  room.currentQuestion = null;
  room.answers = [];
  room.votedUsers = new Set();
  room.currentTurn = (room.currentTurn + 1) % room.users.length;
  room.phase = 'asking';
  
  const nextTurnName = room.users[room.currentTurn].name;
  console.log(`Next turn started in room ${roomCode}, now: ${nextTurnName}`);
  
  const gameRoom = sanitizeGameRoom(room);
  
  broadcastToRoom(roomCode, 'nextTurnStarted', {
    nextTurn: nextTurnName,
    room: gameRoom
  });
  
  res.json({
    success: true,
    room: gameRoom
  });
});

// Serve index.html for all other routes in production (SPA support)
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
  console.log(`Session-based REST API (no Socket.IO)`);
});
