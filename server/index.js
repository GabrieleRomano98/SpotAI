const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

// Determine if we're in production (Cloud Run)
const isProduction = process.env.NODE_ENV === 'production';

const io = socketIO(server, {
  cors: {
    origin: isProduction 
      ? [process.env.FRONTEND_URL || "*"] 
      : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Serve static files in production
if (isProduction) {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Store rooms in memory (in production, use a database)
const rooms = new Map();

// AI answer generation function
function getAPIanswer(question) {
  // For now, just return a static string
  return "AI answer";
}

// Room structure:
// {
//   id: string,
//   code: string,
//   ownerId: string,
//   users: [{ id: string, name: string, socketId: string }],
//   status: 'lobby' | 'playing',
//   currentTurn: number (index of user),
//   currentQuestion: string,
//   answers: [{ userId: string, userName: string, answer: string, votes: [] }],
//   roundHistory: [{ question: string, askedBy: string, answers: [] }],
//   phase: 'asking' | 'answering' | 'voting',
//   votedUsers: Set of userIds who have voted in current round
// }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create a new room
  socket.on('createRoom', (userName) => {
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
        socketId: socket.id,
        points: 0
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
    socket.join(roomCode);
    
    socket.emit('roomCreated', {
      roomCode,
      room: sanitizeLobbyRoom(room)
    });
    
    console.log(`Room created: ${roomCode} by ${userName}`);
  });

  // Join existing room
  socket.on('joinRoom', ({ roomCode, userName }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (room.status === 'playing') {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }
    
    // Check if user already in room
    const existingUser = room.users.find(u => u.name === userName);
    if (existingUser) {
      socket.emit('error', { message: 'Username already taken in this room' });
      return;
    }
    
    const newUser = {
      id: uuidv4(),
      name: userName,
      socketId: socket.id,
      points: 0
    };
    
    room.users.push(newUser);
    socket.join(roomCode);
    
    socket.emit('roomJoined', {
      roomCode,
      room: sanitizeLobbyRoom(room)
    });
    
    // Notify all users in the room
    io.to(roomCode).emit('userJoined', {
      user: { id: newUser.id, name: newUser.name },
      room: sanitizeLobbyRoom(room)
    });
    
    console.log(`User ${userName} joined room: ${roomCode}`);
  });

  // Kick player (owner only)
  socket.on('kickPlayer', ({ roomCode, userId }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const requester = room.users.find(u => u.socketId === socket.id);
    if (!requester || requester.id !== room.ownerId) {
      socket.emit('error', { message: 'Only the owner can kick players' });
      return;
    }
    
    const kickedUserIndex = room.users.findIndex(u => u.id === userId);
    if (kickedUserIndex === -1) {
      socket.emit('error', { message: 'User not found' });
      return;
    }
    
    const kickedUser = room.users[kickedUserIndex];
    room.users.splice(kickedUserIndex, 1);
    
    // Notify the kicked user
    io.to(kickedUser.socketId).emit('playerKicked', {
      kickedUserId: kickedUser.id,
      kickedUserName: kickedUser.name,
      room: sanitizeLobbyRoom(room)
    });
    
    // Notify remaining users
    io.to(roomCode).emit('playerKicked', {
      kickedUserId: kickedUser.id,
      kickedUserName: kickedUser.name,
      room: sanitizeLobbyRoom(room)
    });
    
    console.log(`User ${kickedUser.name} kicked from room: ${roomCode}`);
  });

  // Start game (owner only)
  socket.on('startGame', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const requester = room.users.find(u => u.socketId === socket.id);
    if (!requester || requester.id !== room.ownerId) {
      socket.emit('error', { message: 'Only the owner can start the game' });
      return;
    }
    
    if (room.users.length < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start' });
      return;
    }
    
    room.status = 'playing';
    room.currentTurn = 0;
    room.phase = 'asking';
    room.votedUsers = new Set();
    
    // Notify all users to transition to game
    io.to(roomCode).emit('gameStarted', {
      room: sanitizeGameRoom(room)
    });
    
    console.log(`Game started in room: ${roomCode}`);
  });

  // Get lobby state
  socket.on('getLobbyState', (roomCode) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    socket.emit('lobbyState', sanitizeLobbyRoom(room));
  });

  // Get game state
  socket.on('getGameState', (roomCode) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    socket.emit('gameState', sanitizeGameRoom(room));
  });

  // Submit question
  socket.on('submitQuestion', ({ roomCode, question }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const user = room.users.find(u => u.socketId === socket.id);
    if (!user) {
      socket.emit('error', { message: 'User not in room' });
      return;
    }
    
    // Check if it's the user's turn
    if (room.users[room.currentTurn].id !== user.id) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    
    room.currentQuestion = question;
    room.answers = [];
    room.phase = 'answering';
    
    // Generate and add AI answer immediately
    const aiAnswer = getAPIanswer(question);
    room.answers.push({
      userId: 'AI',
      userName: 'AI',
      answer: aiAnswer,
      votes: [],
      isAI: true
    });
    
    // Notify all users in the room about the new question
    io.to(roomCode).emit('questionReceived', {
      question,
      askedBy: user.name,
      room: sanitizeGameRoom(room)
    });
    
    console.log(`Question submitted in room ${roomCode}: ${question}`);
    console.log(`AI answer added: ${aiAnswer}`);
  });

  // Submit answer
  socket.on('submitAnswer', ({ roomCode, answer }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const user = room.users.find(u => u.socketId === socket.id);
    if (!user) {
      socket.emit('error', { message: 'User not in room' });
      return;
    }
    
    console.log(`[DEBUG] submitAnswer - User: ${user.name}, CurrentTurn: ${room.currentTurn}, TurnUser: ${room.users[room.currentTurn]?.name}`);
    
    // Check if user is the one asking (they shouldn't answer)
    if (room.users[room.currentTurn].id === user.id) {
      console.log(`[DEBUG] User ${user.name} tried to answer their own question`);
      socket.emit('error', { message: 'You cannot answer your own question' });
      return;
    }
    
    // Check if user already answered
    const existingAnswer = room.answers.find(a => a.userId === user.id);
    if (existingAnswer) {
      console.log(`[DEBUG] User ${user.name} already submitted an answer`);
      socket.emit('error', { message: 'You already submitted an answer' });
      return;
    }
    
    room.answers.push({
      userId: user.id,
      userName: user.name,
      answer,
      votes: []
    });
    
    console.log(`[DEBUG] Answer submitted by ${user.name}. Count: ${room.answers.length}/${room.users.length}`);
    
      // Notify room about answer count (but don't reveal answers yet)
      io.to(roomCode).emit('answerSubmitted', {
        submittedCount: room.answers.length,
        totalExpected: room.users.length,
        room: sanitizeGameRoom(room)
      });
      
    // Check if all users (except the one asking) have answered + AI answer
    // Total expected: (users.length - 1) human answers + 1 AI answer = users.length
    if (room.answers.length === room.users.length) {
      // Change phase to voting
      room.phase = 'voting';
      room.votedUsers = new Set();
      
      // Shuffle answers to randomize AI position
      room.answers = room.answers.sort(() => Math.random() - 0.5);
      
      // Reveal all answers
      io.to(roomCode).emit('allAnswersReceived', {
        question: room.currentQuestion,
        askedBy: room.users[room.currentTurn].name,
        answers: room.answers,
        room: sanitizeGameRoom(room)
      });
      
      console.log(`All answers received in room ${roomCode}, entering voting phase`);
    }
  });

  // Vote for an answer
  socket.on('voteAnswer', ({ roomCode, answerUserId }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const user = room.users.find(u => u.socketId === socket.id);
    if (!user) {
      socket.emit('error', { message: 'User not in room' });
      return;
    }
    
    // Check if we're in voting phase
    if (room.phase !== 'voting') {
      socket.emit('error', { message: 'Not in voting phase' });
      return;
    }
    
    // Check if voting is complete (prevent vote changes after all votes are in)
    if (room.votedUsers.size >= room.users.length) {
      socket.emit('error', { message: 'Voting is complete. Cannot change votes.' });
      return;
    }
    
    const answer = room.answers.find(a => a.userId === answerUserId);
    
    if (!answer) {
      socket.emit('error', { message: 'Answer not found' });
      return;
    }
    
    // Can't vote for own answer
    if (answerUserId === user.id) {
      socket.emit('error', { message: 'Cannot vote for your own answer' });
      return;
    }
    
    // Initialize votes array if it doesn't exist
    if (!answer.votes) {
      answer.votes = [];
    }
    
    // Check if user already voted for this answer
    const existingVoteIndex = answer.votes.findIndex(v => v.userId === user.id);
    
    if (existingVoteIndex !== -1) {
      // Remove vote (toggle)
      answer.votes.splice(existingVoteIndex, 1);
      room.votedUsers.delete(user.id);
      console.log(`User ${user.name} removed vote from answer`);
    } else {
      // First, remove any existing vote from other answers (only one vote allowed)
      room.answers.forEach(a => {
        if (a.votes) {
          const voteIndex = a.votes.findIndex(v => v.userId === user.id);
          if (voteIndex !== -1) {
            a.votes.splice(voteIndex, 1);
            console.log(`User ${user.name} removed previous vote from another answer`);
          }
        }
      });
      
      // Add vote to the selected answer
      answer.votes.push({
        userId: user.id,
        userName: user.name
      });
      room.votedUsers.add(user.id);
      console.log(`User ${user.name} voted for answer`);
    }
    
    // Notify all users in the room
    io.to(roomCode).emit('voteUpdated', {
      answers: room.answers,
      votedCount: room.votedUsers.size,
      totalExpected: room.users.length,
      room: sanitizeGameRoom(room)
    });
  });

  // Start next turn (asker only, after voting is complete)
  socket.on('startNextTurn', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const user = room.users.find(u => u.socketId === socket.id);
    if (!user) {
      socket.emit('error', { message: 'User not in room' });
      return;
    }
    
    // Only the person who asked the question can start next turn
    if (room.users[room.currentTurn].id !== user.id) {
      socket.emit('error', { message: 'Only the question asker can start the next turn' });
      return;
    }
    
    // Calculate and award points based on votes
    room.answers.forEach(answer => {
      if (answer.votes && answer.votes.length > 0) {
        // If it's a human answer, award points to the answer author
        if (!answer.isAI) {
          const answerUser = room.users.find(u => u.id === answer.userId);
          if (answerUser) {
            answerUser.points += answer.votes.length;
            console.log(`Awarded ${answer.votes.length} point(s) to ${answerUser.name}`);
          }
        } else {
          // If it's the AI answer, award bonus points to those who identified it
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
    
    // Save completed round to history
    room.roundHistory.push({
      question: room.currentQuestion,
      askedBy: room.users[room.currentTurn].name,
      answers: [...room.answers]
    });
    
    // Reset for next round
    room.currentQuestion = null;
    room.answers = [];
    room.votedUsers = new Set();
    
    // Move to next turn
    room.currentTurn = (room.currentTurn + 1) % room.users.length;
    room.phase = 'asking';
    
    const nextTurnName = room.users[room.currentTurn].name;
    
    // Notify all users
    io.to(roomCode).emit('nextTurnStarted', {
      nextTurn: nextTurnName,
      room: sanitizeGameRoom(room)
    });
    
    console.log(`Next turn started in room ${roomCode}, now: ${nextTurnName}`);
  });

  // Get room state (legacy - redirects to appropriate handler)
  socket.on('getRoomState', (roomCode) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (room.status === 'lobby') {
      socket.emit('lobbyState', sanitizeLobbyRoom(room));
    } else {
      socket.emit('gameState', sanitizeGameRoom(room));
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Find and remove user from their room
    rooms.forEach((room, roomCode) => {
      const userIndex = room.users.findIndex(u => u.socketId === socket.id);
      
      if (userIndex !== -1) {
        const user = room.users[userIndex];
        room.users.splice(userIndex, 1);
        
        // If room is empty, delete it
        if (room.users.length === 0) {
          rooms.delete(roomCode);
          console.log(`Room ${roomCode} deleted (empty)`);
        } else {
          // Adjust current turn if needed
          if (room.currentTurn >= room.users.length) {
            room.currentTurn = 0;
          }
          
          // Notify remaining users
          io.to(roomCode).emit('userLeft', {
            user: { id: user.id, name: user.name },
            room: room.status === 'lobby' ? sanitizeLobbyRoom(room) : sanitizeGameRoom(room)
          });
        }
      }
    });
  });
});

// Helper function to sanitize lobby room data
function sanitizeLobbyRoom(room) {
  return {
    id: room.id,
    code: room.code,
    ownerId: room.ownerId,
    users: room.users.map(u => ({ id: u.id, name: u.name, points: u.points || 0 })),
    status: room.status
  };
}

// Helper function to sanitize game room data
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
    totalAnswersExpected: room.users.length, // (users.length - 1) human answers + 1 AI answer
    roundHistory: room.roundHistory,
    phase: room.phase,
    votedCount: room.votedUsers ? room.votedUsers.size : 0,
    totalVotesExpected: room.users.length
  };
}

// Legacy helper function for backward compatibility
function sanitizeRoom(room) {
  if (room.status === 'lobby') {
    return sanitizeLobbyRoom(room);
  } else {
    return sanitizeGameRoom(room);
  }
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
});

// Serve index.html for all other routes in production (SPA support)
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}
