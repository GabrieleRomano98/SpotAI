// REST API client for SpotAI
const SERVER_URL = import.meta.env.PROD ? window.location.origin : 'http://localhost:3000';
const API_BASE = `${SERVER_URL}/api`;

class SpotAIAPI {
  constructor() {
    this.eventSource = null;
    this.roomCode = null;
    this.listeners = new Map();
  }

  // Helper to make fetch requests with credentials
  async request(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include', // Include cookies for session
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Event emitter pattern (similar to Socket.IO)
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => callback(data));
  }

  // Start SSE connection for real-time updates
  startListening(roomCode) {
    this.roomCode = roomCode;
    this.stopListening(); // Clear any existing connection
    
    // Create EventSource for Server-Sent Events
    this.eventSource = new EventSource(`${API_BASE}/rooms/${roomCode}/events`, {
      withCredentials: true
    });
    
    // Handle connection
    this.eventSource.addEventListener('connected', (e) => {
      console.log('SSE connected:', e.data);
    });
    
    // Handle room state updates
    this.eventSource.addEventListener('roomState', (e) => {
      const room = JSON.parse(e.data);
      this.emit('roomState', room);
    });
    
    // Handle user joined
    this.eventSource.addEventListener('userJoined', (e) => {
      const data = JSON.parse(e.data);
      this.emit('userJoined', data);
    });
    
    // Handle user left
    this.eventSource.addEventListener('userLeft', (e) => {
      const data = JSON.parse(e.data);
      this.emit('userLeft', data);
    });
    
    // Handle game started
    this.eventSource.addEventListener('gameStarted', (e) => {
      const data = JSON.parse(e.data);
      this.emit('gameStarted', data);
    });
    
    // Handle question received
    this.eventSource.addEventListener('questionReceived', (e) => {
      const data = JSON.parse(e.data);
      this.emit('questionReceived', data);
    });
    
    // Handle answer submitted
    this.eventSource.addEventListener('answerSubmitted', (e) => {
      const data = JSON.parse(e.data);
      this.emit('answerSubmitted', data);
    });
    
    // Handle voting phase
    this.eventSource.addEventListener('votingPhase', (e) => {
      const data = JSON.parse(e.data);
      this.emit('votingPhase', data);
    });
    
    // Handle vote updated
    this.eventSource.addEventListener('voteUpdated', (e) => {
      const data = JSON.parse(e.data);
      this.emit('voteUpdated', data);
    });
    
    // Handle results ready
    this.eventSource.addEventListener('resultsReady', (e) => {
      const data = JSON.parse(e.data);
      this.emit('resultsReady', data);
    });
    
    // Handle next turn
    this.eventSource.addEventListener('nextTurnStarted', (e) => {
      const data = JSON.parse(e.data);
      this.emit('nextTurnStarted', data);
    });
    
    // Handle game over
    this.eventSource.addEventListener('gameOver', (e) => {
      const data = JSON.parse(e.data);
      this.emit('gameOver', data);
    });
    
    // Handle errors
    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      this.emit('error', error);
    };
  }

  stopListening() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  // Keep old method name for compatibility
  startPolling(roomCode) {
    this.startListening(roomCode);
  }

  stopPolling() {
    this.stopListening();
  }

  // API Methods
  async createRoom(userName) {
    const data = await this.request('/rooms/create', {
      method: 'POST',
      body: JSON.stringify({ userName })
    });
    return data;
  }

  async joinRoom(roomCode, userName) {
    const data = await this.request('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({ userName, roomCode })
    });
    return data;
  }

  async getRoomState() {
    return this.request(`/rooms/${this.roomCode}`);
  }

  async startGame() {
    return this.request(`/rooms/${this.roomCode}/start`, {
      method: 'POST'
    });
  }

  async submitQuestion(question) {
    return this.request(`/rooms/${this.roomCode}/question`, {
      method: 'POST',
      body: JSON.stringify({ question })
    });
  }

  async submitAnswer(answer) {
    return this.request(`/rooms/${this.roomCode}/answer`, {
      method: 'POST',
      body: JSON.stringify({ answer })
    });
  }

  async submitVote(answerId) {
    return this.request(`/rooms/${this.roomCode}/vote`, {
      method: 'POST',
      body: JSON.stringify({ answerUserId: answerId })
    });
  }

  async nextTurn() {
    return this.request(`/rooms/${this.roomCode}/next-turn`, {
      method: 'POST'
    });
  }

  async leaveRoom() {
    return this.request(`/rooms/${this.roomCode}/leave`, {
      method: 'POST'
    });
  }

  async endGame() {
    return this.request(`/rooms/${this.roomCode}/end`, {
      method: 'POST'
    });
  }
}

// Create and export a singleton instance
const api = new SpotAIAPI();
export default api;
