<template>
  <div class="chat-container">
    <div class="chat-messages" ref="chatMessages">
      <!-- Welcome Message (when no active question) -->
      <div v-if="!currentQuestion && roundHistory.length === 0" class="welcome-message">
        <div class="welcome-icon">💬</div>
        <h3>Welcome to SpotAI!</h3>
        <p v-if="isMyTurn">You're up first! Ask a question to start the game.</p>
        <p v-else>Waiting for {{ currentQuestionAuthor }} to ask the first question...</p>
        <p class="welcome-hint">💡 Previous rounds will be accessible from the sidebar</p>
      </div>
      
      <!-- Round Complete Message (between rounds) -->
      <div v-if="!currentQuestion && roundHistory.length > 0" class="round-complete-message">
        <div class="complete-icon">✨</div>
        <h3>Round Complete!</h3>
        <p v-if="isMyTurn">It's your turn, send a question!</p>
        <p v-else>Waiting for {{ currentQuestionAuthor }} to start the next turn...</p>
        <p class="complete-hint">📚 View previous rounds in the sidebar</p>
      </div>
      
      <!-- Current Question -->
      <div v-if="currentQuestion" class="message-group current">
        <div class="message question-message">
          <div class="message-header">
            <span class="message-author">{{ currentQuestionAuthor }}</span>
            <span class="message-badge">Question</span>
          </div>
          <div class="message-bubble question-bubble">
            {{ currentQuestion }}
          </div>
        </div>
        
        <!-- Current Answers (during voting phase) -->
        <ChatMessage
          v-if="phase === 'voting'"
          :answers="answers"
          :show-identity="allVotesReceived"
          :show-vote-buttons="!allVotesReceived"
          :current-user-id="currentUserId"
          @vote-success="handleVoteSuccess"
          @vote-error="handleVoteError"
        />
        
        <!-- Waiting indicator (answering phase) -->
        <div v-if="phase === 'answering' && (isMyTurn || hasAnswered)" class="waiting-indicator">
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span class="waiting-text">Waiting for {{ totalAnswersExpected - answersCount }} answer(s)...</span>
        </div>
        
        <!-- Voting progress indicator -->
        <div v-if="phase === 'voting'" class="voting-progress">
          <span class="voting-text">Voting: {{ votedCount }} / {{ totalVotesExpected }} players</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import ChatMessage from './ChatMessage.vue'
import api from '../api'

export default {
  name: 'GameChat',
  components: {
    ChatMessage
  },
  props: {
    room: {
      type: Object,
      required: true
    },
    isMyTurn: {
      type: Boolean,
      required: true
    },
    currentUserId: {
      type: String,
      default: null
    }
  },
  emits: ['room-updated', 'show-message', 'answered'],
  setup(props, { emit }) {
    const hasAnswered = ref(false)
    
    const currentQuestion = computed(() => props.room.currentQuestion)
    const currentQuestionAuthor = computed(() => {
      if (props.room.users.length > 0 && props.room.currentTurn >= 0) {
        return props.room.users[props.room.currentTurn]?.name || 'Unknown'
      }
      return 'Unknown'
    })
    const answers = computed(() => props.room.answers || [])
    const phase = computed(() => props.room.phase)
    const allVotesReceived = computed(() => props.room.votedCount >= props.room.totalVotesExpected)
    const answersCount = computed(() => props.room.answersCount)
    const totalAnswersExpected = computed(() => props.room.totalAnswersExpected)
    const votedCount = computed(() => props.room.votedCount)
    const totalVotesExpected = computed(() => props.room.totalVotesExpected)
    const roundHistory = computed(() => props.room.roundHistory || [])
    
    const handleVoteSuccess = (roomData) => {
      emit('room-updated', roomData)
    }
    
    const handleVoteError = (error) => {
      emit('show-message', { type: 'error', text: error })
    }
    
    const handleQuestionReceived = (data) => {
      emit('room-updated', data.room)
      hasAnswered.value = false
      emit('answered', false)
    }
    
    const handleAnswerSubmitted = (data) => {
      emit('room-updated', data.room)
    }
    
    const handleVotingPhase = (data) => {
      emit('room-updated', data.room)
      hasAnswered.value = false
      emit('answered', false)
      emit('show-message', { type: 'success', text: '🎉 All answers received! Time to vote!' })
    }
    
    const handleVoteUpdated = (data) => {
      emit('room-updated', data.room)
    }
    
    onMounted(() => {
      api.on('questionReceived', handleQuestionReceived)
      api.on('answerSubmitted', handleAnswerSubmitted)
      api.on('votingPhase', handleVotingPhase)
      api.on('voteUpdated', handleVoteUpdated)
    })
    
    onUnmounted(() => {
      api.off('questionReceived', handleQuestionReceived)
      api.off('answerSubmitted', handleAnswerSubmitted)
      api.off('votingPhase', handleVotingPhase)
      api.off('voteUpdated', handleVoteUpdated)
    })
    
    return {
      hasAnswered,
      currentQuestion,
      currentQuestionAuthor,
      answers,
      phase,
      allVotesReceived,
      answersCount,
      totalAnswersExpected,
      votedCount,
      totalVotesExpected,
      roundHistory,
      handleVoteSuccess,
      handleVoteError
    }
  }
}
</script>

<style scoped>
/* Styles are in Game.css */
</style>
