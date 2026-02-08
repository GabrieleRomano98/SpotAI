import { io } from 'socket.io-client'

// In production (Cloud Run), connect to same server
// In development, connect to localhost backend
const SERVER_URL = import.meta.env.PROD 
  ? window.location.origin  // Production: same domain (https://spotai-xxx.run.app)
  : 'http://localhost:3000' // Development: separate backend

export const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
})

socket.on('connect', () => {
  console.log('Connected to server')
})

socket.on('disconnect', () => {
  console.log('Disconnected from server')
})

socket.on('connect_error', (error) => {
  console.error('Connection error:', error)
})
