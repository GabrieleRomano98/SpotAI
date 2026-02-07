import { io } from 'socket.io-client'

const SERVER_URL = 'http://localhost:3000'

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
