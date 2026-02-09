<template>
  <div class="game-layout">
    <!-- Mobile Header -->
    <GameTopBar @toggle-sidebar="toggleSidebar" />

    <!-- Sidebar with Round History Modal -->
    <GameSidebar
      :is-open="sidebarOpen"
      :users="room.users"
      :current-turn="room.currentTurn"
      :is-my-turn="isMyTurn"
      :round-history="room.roundHistory"
      :viewing-round="viewingRound"
      @close="closeSidebar"
      @view-round="viewRound"
      @close-round-view="closeRoundView"
      @leave-game="leaveGame"
    />

    <!-- Main Content -->
    <main class="main-content">
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <!-- Chat Messages Area -->
      <GameChat
        :room="room"
        :is-my-turn="isMyTurn"
        :current-user-id="currentUser?.id"
        @room-updated="handleRoomUpdate"
        @show-message="handleMessage"
        @answered="handleAnswered"
      />
      
      <!-- Input Area -->
      <ChatInput
        :is-my-turn="isMyTurn"
        :phase="room.phase"
        :has-answered="hasAnswered"
        :all-votes-received="allVotesReceived"
        :current-question-author="getCurrentQuestionAuthor()"
        @submit-success="handleRoomUpdate"
        @submit-error="handleError"
        @next-turn-success="handleNextTurn"
        @next-turn-error="handleError"
      />
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import GameTopBar from '../components/GameTopBar.vue'
import GameSidebar from '../components/GameSidebar.vue'
import GameChat from '../components/GameChat.vue'
import ChatInput from '../components/ChatInput.vue'
import './Game.css'

export default {
  name: 'Game',
  components: {
    GameTopBar,
    GameSidebar,
    GameChat,
    ChatInput
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const code = ref(route.params.code)
    const userName = ref(route.query.userName || '')
    const error = ref('')
    const hasAnswered = ref(false)
    const sidebarOpen = ref(false)
    const viewingRound = ref(null)
    
    const room = ref({
      users: [],
      currentTurn: 0,
      currentQuestion: null,
      answers: [],
      answersCount: 0,
      totalAnswersExpected: 0,
      roundHistory: [],
      phase: 'asking',
      votedCount: 0,
      totalVotesExpected: 0
    })
    
    const currentUser = computed(() => {
      return room.value.users.find(u => u.name === userName.value)
    })
    
    const isMyTurn = computed(() => {
      if (!currentUser.value || room.value.users.length === 0) return false
      return room.value.users[room.value.currentTurn]?.id === currentUser.value.id
    })
    
    const allVotesReceived = computed(() => {
      return room.value.votedCount >= room.value.totalVotesExpected
    })
    
    const handleRoomUpdate = (roomData) => {
      if (roomData) {
        room.value = roomData
      }
    }
    
    const handleAnswered = (answered) => {
      hasAnswered.value = answered
    }
    
    const handleMessage = (message) => {
      if (message.type === 'error') {
        error.value = message.text
        setTimeout(() => {
          error.value = ''
        }, 5000)
      }
      // Ignore success messages
    }
    
    const handleError = (errorMessage) => {
      error.value = errorMessage
      setTimeout(() => {
        error.value = ''
      }, 5000)
    }
    
    const handleNextTurn = (roomData) => {
      if (roomData) {
        room.value = roomData
        hasAnswered.value = false
      }
    }
    
    const leaveGame = () => {
      if (confirm('Are you sure you want to leave the game?')) {
        router.push('/')
      }
    }
    
    const toggleSidebar = () => {
      sidebarOpen.value = !sidebarOpen.value
    }
    
    const closeSidebar = () => {
      sidebarOpen.value = false
    }
    
    const getCurrentQuestionAuthor = () => {
      if (room.value.users.length > 0 && room.value.currentTurn >= 0) {
        return room.value.users[room.value.currentTurn]?.name || 'Unknown'
      }
      return 'Unknown'
    }
    
    const viewRound = (index) => {
      viewingRound.value = index
      closeSidebar()
    }
    
    const closeRoundView = () => {
      viewingRound.value = null
    }
    
    // Event handlers
    const handleRoomState = (data) => {
      room.value = data
    }
    
    const handleUserLeft = (data) => {
      room.value = data.room
      error.value = `${data.userName} left the game`
      setTimeout(() => {
        error.value = ''
      }, 3000)
    }
    
    const handleNextTurnStarted = (data) => {
      room.value = data.room
      hasAnswered.value = false
      // No success message for next turn
    }
    
    const handleApiError = (data) => {
      error.value = data.message
      setTimeout(() => {
        error.value = ''
      }, 5000)
    }
    
    onMounted(async () => {
      if (!userName.value) {
        router.push('/')
        return
      }
      
      // Fetch initial room state
      try {
        const roomData = await api.getRoomState()
        room.value = roomData
      } catch (err) {
        console.error('Failed to load room state:', err)
        error.value = 'Failed to load game. Please try again.'
      }
      
      // Set up API listeners
      api.on('roomState', handleRoomState)
      api.on('userLeft', handleUserLeft)
      api.on('nextTurnStarted', handleNextTurnStarted)
      api.on('error', handleApiError)
      
      // Start SSE connection for real-time updates
      api.startPolling(code.value)
    })
    
    onUnmounted(() => {
      // Stop polling
      api.stopPolling()
      
      // Clean up listeners
      api.off('roomState', handleRoomState)
      api.off('userLeft', handleUserLeft)
      api.off('nextTurnStarted', handleNextTurnStarted)
      api.off('error', handleApiError)
    })
    
    return {
      code,
      userName,
      room,
      currentUser,
      isMyTurn,
      allVotesReceived,
      error,
      hasAnswered,
      leaveGame,
      sidebarOpen,
      toggleSidebar,
      closeSidebar,
      getCurrentQuestionAuthor,
      handleRoomUpdate,
      handleAnswered,
      handleMessage,
      handleError,
      handleNextTurn,
      viewingRound,
      viewRound,
      closeRoundView
    }
  }
}
</script>
