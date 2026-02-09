<template>
  <div>
    <!-- Sidebar Overlay (mobile only) -->
    <div 
      v-if="isOpen" 
      class="sidebar-overlay"
      @click="$emit('close')"
    ></div>

    <!-- Sidebar -->
    <aside class="sidebar" :class="{ 'sidebar-open': isOpen }">
      <div class="sidebar-header">
        <h2>Room Info</h2>
        <button class="close-sidebar-btn" @click="$emit('close')">✕</button>
      </div>
      
      <div class="sidebar-content">
        <!-- Players List -->
        <div class="sidebar-section">
          <h3>Players ({{ users.length }})</h3>
          <div class="players-list-sidebar">
            <div
              v-for="user in sortedPlayers"
              :key="user.id"
              class="player-item-sidebar"
              :class="{ 'active-turn': isUserCurrentTurn(user) }"
            >
              <div class="player-info">
                <span class="player-name">{{ user.name }}</span>
                <span class="player-points">{{ user.points || 0 }} pts</span>
              </div>
              <span v-if="isUserCurrentTurn(user)" class="turn-indicator">🎯</span>
            </div>
          </div>
        </div>
        
        <!-- Current Turn Info -->
        <div v-if="users.length > 0" class="sidebar-section turn-info-sidebar">
          <h3>Current Turn</h3>
          <p class="current-turn-text">
            {{ users[currentTurn]?.name }}
            <span v-if="isMyTurn" class="you-badge">(You)</span>
          </p>
        </div>
        
        <!-- Previous Rounds -->
        <div v-if="roundHistory && roundHistory.length > 0" class="sidebar-section">
          <h3>Previous Rounds ({{ roundHistory.length }})</h3>
          <div class="rounds-list">
            <div
              v-for="(round, index) in roundHistory"
              :key="`sidebar-round-${index}`"
              class="round-item"
              @click="$emit('view-round', index)"
            >
              <div class="round-number">Round {{ index + 1 }}</div>
              <div class="round-asker">By {{ round.askedBy }}</div>
              <div class="round-preview">{{ round.question.substring(0, 40) }}{{ round.question.length > 40 ? '...' : '' }}</div>
            </div>
          </div>
        </div>
        
        <!-- Leave Game Button (desktop) -->
        <div class="sidebar-section">
          <button class="btn btn-secondary btn-full" @click="$emit('leave-game')">
            Leave Game
          </button>
        </div>
      </div>
    </aside>

    <!-- Round History Modal -->
    <div v-if="viewingRound !== null" class="modal-overlay" @click="$emit('close-round-view')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Round {{ viewingRound + 1 }}</h2>
          <button class="close-modal-btn" @click="$emit('close-round-view')">✕</button>
        </div>
        <div class="modal-body">
          <div class="modal-question">
            <div class="modal-question-header">
              <span class="modal-badge">Question</span>
              <span class="modal-author">{{ roundHistory[viewingRound]?.askedBy }}</span>
            </div>
            <div class="modal-question-text">
              {{ roundHistory[viewingRound]?.question }}
            </div>
          </div>
          
          <div class="modal-answers">
            <ChatMessage
              :answers="roundHistory[viewingRound]?.answers || []"
              :show-identity="true"
              :show-vote-buttons="false"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import ChatMessage from './ChatMessage.vue'

export default {
  name: 'GameSidebar',
  components: {
    ChatMessage
  },
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    users: {
      type: Array,
      required: true
    },
    currentTurn: {
      type: Number,
      required: true
    },
    isMyTurn: {
      type: Boolean,
      default: false
    },
    roundHistory: {
      type: Array,
      default: () => []
    },
    viewingRound: {
      type: Number,
      default: null
    }
  },
  emits: ['close', 'view-round', 'close-round-view', 'leave-game'],
  setup(props) {
    const sortedPlayers = computed(() => {
      // Create a copy of the users array and sort by points descending
      return [...props.users].sort((a, b) => {
        const pointsA = a.points || 0
        const pointsB = b.points || 0
        return pointsB - pointsA
      })
    })
    
    const isUserCurrentTurn = (user) => {
      if (props.users.length === 0) return false
      return props.users[props.currentTurn]?.id === user.id
    }
    
    return {
      sortedPlayers,
      isUserCurrentTurn
    }
  }
}
</script>

<style scoped>
/* Styles are in Game.css */
</style>
