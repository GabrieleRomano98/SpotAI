<template>
  <div class="container">
    <h1>SpotAI Chat</h1>
    
    <div class="card">
      <h2>Room Lobby</h2>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <!-- Room Info -->
      <div class="room-header">
        <div>
          <h3>Room Code: <span class="room-code">{{ code }}</span></h3>
          <p class="subtitle">Share this link with others to invite them</p>
        </div>
        <button class="btn btn-secondary" @click="copyRoomLink">
          Copy Link
        </button>
      </div>
      
      <!-- Toast Notification -->
      <div v-if="successMessage" class="toast-notification">
        {{ successMessage }}
      </div>
      
      <!-- Players List -->
      <div class="players-section">
        <h3>Players ({{ room.users.length }})</h3>
        <div class="players-list">
          <div
            v-for="user in room.users"
            :key="user.id"
            class="player-item"
          >
            <div class="player-info">
              <span class="player-name">{{ user.name }}</span>
              <span v-if="user.id === room.ownerId" class="owner-badge">👑 Owner</span>
            </div>
            <button
              v-if="isOwner && user.id !== room.ownerId"
              class="btn-kick"
              @click="kickPlayer(user.id)"
            >
              Kick
            </button>
          </div>
        </div>
      </div>
      
      <!-- Owner Controls -->
      <div v-if="isOwner" class="owner-controls">
        <div class="info-message" style="margin-bottom: 15px;">
          You are the room owner. You can kick players and start the game when ready.
        </div>
        <button
          class="btn btn-primary"
          @click="startGame"
          :disabled="room.users.length < 2"
        >
          Start Game
        </button>
        <p v-if="room.users.length < 2" class="helper-text">
          Need at least 2 players to start the game
        </p>
      </div>
      
      <!-- Non-owner message -->
      <div v-else class="waiting-message">
        <div class="info-message">
          Waiting for {{ ownerName }} to start the game...
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { socket } from '../socket'
import './Lobby.css'

export default {
  name: 'Lobby',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const code = ref(route.params.code)
    const userName = ref(route.query.userName || '')
    const error = ref('')
    const successMessage = ref('')
    
    const room = ref({
      users: [],
      ownerId: null
    })
    
    const currentUser = computed(() => {
      return room.value.users.find(u => u.name === userName.value)
    })
    
    const isOwner = computed(() => {
      if (!currentUser.value || !room.value.ownerId) return false
      return currentUser.value.id === room.value.ownerId
    })
    
    const ownerName = computed(() => {
      const owner = room.value.users.find(u => u.id === room.value.ownerId)
      return owner ? owner.name : 'the owner'
    })
    
    const copyRoomLink = () => {
      const roomLink = `${window.location.origin}/?room=${code.value}`
      navigator.clipboard.writeText(roomLink)
      successMessage.value = '🔗 Room link copied to clipboard!'
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
    }
    
    const kickPlayer = (userId) => {
      socket.emit('kickPlayer', {
        roomCode: code.value,
        userId
      })
    }
    
    const startGame = () => {
      socket.emit('startGame', {
        roomCode: code.value
      })
    }
    
    // Socket event handlers
    const handleLobbyState = (data) => {
      room.value = data
    }
    
    const handleUserJoined = (data) => {
      room.value = data.room
      successMessage.value = `✅ ${data.user.name} joined the lobby!`
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
    }
    
    const handleUserLeft = (data) => {
      room.value = data.room
      successMessage.value = `👋 ${data.user.name} left the lobby`
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
    }
    
    const handlePlayerKicked = (data) => {
      if (data.kickedUserId === currentUser.value?.id) {
        error.value = 'You have been kicked from the room'
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        room.value = data.room
        successMessage.value = `❌ ${data.kickedUserName} was kicked from the room`
        setTimeout(() => {
          successMessage.value = ''
        }, 3000)
      }
    }
    
    const handleGameStarted = (data) => {
      router.push({
        name: 'Game',
        params: { code: code.value },
        query: { userName: userName.value }
      })
    }
    
    const handleError = (data) => {
      error.value = data.message
      setTimeout(() => {
        error.value = ''
      }, 5000)
    }
    
    onMounted(() => {
      if (!userName.value) {
        router.push('/')
        return
      }
      
      // Request current lobby state
      socket.emit('getLobbyState', code.value)
      
      // Set up socket listeners
      socket.on('lobbyState', handleLobbyState)
      socket.on('userJoined', handleUserJoined)
      socket.on('userLeft', handleUserLeft)
      socket.on('playerKicked', handlePlayerKicked)
      socket.on('gameStarted', handleGameStarted)
      socket.on('error', handleError)
    })
    
    onUnmounted(() => {
      // Clean up socket listeners
      socket.off('lobbyState', handleLobbyState)
      socket.off('userJoined', handleUserJoined)
      socket.off('userLeft', handleUserLeft)
      socket.off('playerKicked', handlePlayerKicked)
      socket.off('gameStarted', handleGameStarted)
      socket.off('error', handleError)
    })
    
    return {
      code,
      userName,
      room,
      isOwner,
      ownerName,
      error,
      successMessage,
      copyRoomLink,
      kickPlayer,
      startGame
    }
  }
}
</script>
