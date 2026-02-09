<template>
  <div class="container">
    <h1>SpotAI Chat</h1>
    
    <div class="card">
      <h2>Welcome!</h2>
      <p style="margin-bottom: 30px; color: #718096;">Create a new room or join an existing one to start chatting.</p>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <!-- Tab Navigation -->
      <div class="tabs">
        <button
          class="tab-button"
          :class="{ active: activeTab === 'create' }"
          @click="activeTab = 'create'"
        >
          Create Room
        </button>
        <button
          class="tab-button"
          :class="{ active: activeTab === 'join' }"
          @click="activeTab = 'join'"
        >
          Join Room
        </button>
      </div>
      
      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Create Room Section -->
        <div v-show="activeTab === 'create'" class="section">
          <h3>Create a New Room</h3>
          <div class="form-group">
            <input
              v-model="createUserName"
              type="text"
              placeholder="Enter your name"
              @keyup.enter="createRoom"
            />
          </div>
          <button class="btn btn-primary" @click="createRoom" :disabled="!createUserName.trim()">
            Create Room
          </button>
        </div>
        
        <!-- Join Room Section -->
        <div v-show="activeTab === 'join'" class="section">
          <h3>Join Existing Room</h3>
          <div class="form-group">
            <input
              v-model="joinUserName"
              type="text"
              placeholder="Enter your name"
              @keyup.enter="joinRoom"
            />
          </div>
          <div class="form-group">
            <input
              v-model="roomCode"
              type="text"
              placeholder="Enter room code"
              @keyup.enter="joinRoom"
              style="text-transform: uppercase"
            />
          </div>
          <button class="btn btn-secondary" @click="joinRoom" :disabled="!joinUserName.trim() || !roomCode.trim()">
            Join Room
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import './Home.css'

export default {
  name: 'Home',
  setup() {
    const router = useRouter()
    
    // Check URL for room code parameter
    const urlParams = new URLSearchParams(window.location.search)
    const roomCodeFromUrl = urlParams.get('room')
    
    const activeTab = ref(roomCodeFromUrl ? 'join' : 'create')
    const createUserName = ref('')
    const joinUserName = ref('')
    const roomCode = ref(roomCodeFromUrl ? roomCodeFromUrl.toUpperCase() : '')
    const error = ref('')
    
    const createRoom = async () => {
      if (!createUserName.value.trim()) return
      
      error.value = ''
      try {
        const { roomCode } = await api.createRoom(createUserName.value.trim())
        router.push({
          name: 'Lobby',
          params: { code: roomCode },
          query: { userName: createUserName.value.trim() }
        })
      } catch (err) {
        error.value = err.message
      }
    }
    
    const joinRoom = async () => {
      if (!joinUserName.value.trim() || !roomCode.value.trim()) return
      
      error.value = ''
      const code = roomCode.value.trim().toUpperCase()
      
      try {
        await api.joinRoom(code, joinUserName.value.trim())
        router.push({
          name: 'Lobby',
          params: { code },
          query: { userName: joinUserName.value.trim() }
        })
      } catch (err) {
        error.value = err.message
      }
    }
    
    return {
      activeTab,
      createUserName,
      joinUserName,
      roomCode,
      error,
      createRoom,
      joinRoom
    }
  }
}
</script>

