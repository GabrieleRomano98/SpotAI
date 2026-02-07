<template>
  <div class="game-layout">
    <!-- Mobile Header -->
    <div class="mobile-header">
      <button class="hamburger-btn" @click="toggleSidebar">
        <span class="hamburger-icon">☰</span>
      </button>
      <h1>SpotAI</h1>
    </div>

    <!-- Sidebar Overlay (mobile only) -->
    <div 
      v-if="sidebarOpen" 
      class="sidebar-overlay"
      @click="closeSidebar"
    ></div>

    <!-- Sidebar -->
    <aside class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
      <div class="sidebar-header">
        <h2>Room Info</h2>
        <button class="close-sidebar-btn" @click="closeSidebar">✕</button>
      </div>
      
      <div class="sidebar-content">
        <!-- Players List -->
        <div class="sidebar-section">
          <h3>Players ({{ room.users.length }})</h3>
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
        <div v-if="room.users.length > 0" class="sidebar-section turn-info-sidebar">
          <h3>Current Turn</h3>
          <p class="current-turn-text">
            {{ room.users[room.currentTurn]?.name }}
            <span v-if="isMyTurn" class="you-badge">(You)</span>
          </p>
        </div>
        
        <!-- Previous Rounds -->
        <div v-if="room.roundHistory && room.roundHistory.length > 0" class="sidebar-section">
          <h3>Previous Rounds ({{ room.roundHistory.length }})</h3>
          <div class="rounds-list">
            <div
              v-for="(round, index) in room.roundHistory"
              :key="`sidebar-round-${index}`"
              class="round-item"
              @click="viewRound(index)"
            >
              <div class="round-number">Round {{ index + 1 }}</div>
              <div class="round-asker">By {{ round.askedBy }}</div>
              <div class="round-preview">{{ round.question.substring(0, 40) }}{{ round.question.length > 40 ? '...' : '' }}</div>
            </div>
          </div>
        </div>
        
        <!-- Leave Game Button (desktop) -->
        <div class="sidebar-section">
          <button class="btn btn-secondary btn-full" @click="leaveGame">
            Leave Game
          </button>
        </div>
      </div>
    </aside>

    <!-- Round History Modal -->
    <div v-if="viewingRound !== null" class="modal-overlay" @click="closeRoundView">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Round {{ viewingRound + 1 }}</h2>
          <button class="close-modal-btn" @click="closeRoundView">✕</button>
        </div>
        <div class="modal-body">
          <div class="modal-question">
            <div class="modal-question-header">
              <span class="modal-badge">Question</span>
              <span class="modal-author">{{ room.roundHistory[viewingRound]?.askedBy }}</span>
            </div>
            <div class="modal-question-text">
              {{ room.roundHistory[viewingRound]?.question }}
            </div>
          </div>
          
          <div class="modal-answers">
            <div
              v-for="(answer, aIndex) in room.roundHistory[viewingRound]?.answers"
              :key="`modal-answer-${aIndex}`"
              class="modal-answer"
              :class="{ 'modal-ai-answer': answer.isAI }"
            >
              <div class="modal-answer-header">
                <span class="modal-badge answer-badge">Answer</span>
                <span class="modal-author" :class="{ 'ai-author': answer.isAI }">{{ answer.userName }}</span>
              </div>
              <div class="modal-answer-text" :class="{ 'modal-ai-text': answer.isAI }">
                {{ answer.answer }}
              </div>
              <div v-if="answer.votes && answer.votes.length > 0" class="modal-votes">
                <span class="modal-votes-count">{{ answer.votes.length }} vote(s)</span>
                <span class="modal-voters">{{ answer.votes.map(v => v.userName).join(', ') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main class="main-content">
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <!-- Toast Notification -->
      <div v-if="successMessage" class="toast-notification">
        {{ successMessage }}
      </div>
      
      <!-- Chat Messages Area -->
      <div class="chat-container">
        <div class="chat-messages" ref="chatMessages">
          <!-- Welcome Message (when no active question) -->
          <div v-if="!room.currentQuestion && room.roundHistory && room.roundHistory.length === 0" class="welcome-message">
            <div class="welcome-icon">💬</div>
            <h3>Welcome to SpotAI!</h3>
            <p v-if="isMyTurn">You're up first! Ask a question to start the game.</p>
            <p v-else>Waiting for {{ getCurrentQuestionAuthor() }} to ask the first question...</p>
            <p class="welcome-hint">💡 Previous rounds will be accessible from the sidebar</p>
          </div>
          
          <!-- Round Complete Message (between rounds) -->
          <div v-if="!room.currentQuestion && room.roundHistory && room.roundHistory.length > 0" class="round-complete-message">
            <div class="complete-icon">✨</div>
            <h3>Round Complete!</h3>
            <p v-if="isMyTurn">It's your turn, send a question!</p>
            <p v-else>Waiting for {{ getCurrentQuestionAuthor() }} to start the next turn...</p>
            <p class="complete-hint">📚 View previous rounds in the sidebar</p>
          </div>
          
          <!-- Current Question -->
          <div v-if="room.currentQuestion" class="message-group current">
            <div class="message question-message">
              <div class="message-header">
                <span class="message-author">{{ getCurrentQuestionAuthor() }}</span>
                <span class="message-badge">Question</span>
              </div>
              <div class="message-bubble question-bubble">
                {{ room.currentQuestion }}
              </div>
            </div>
            
            <!-- Current Answers (during voting phase) -->
            <div
              v-if="room.phase === 'voting'"
              v-for="(answer, aIndex) in room.answers"
              :key="`current-answer-${aIndex}`"
              class="message answer-message"
              :class="{ 'ai-answer': answer.isAI && allVotesReceived }"
            >
              <div v-if="allVotesReceived" class="message-header">
                <span class="message-author" :class="{ 'ai-author': answer.isAI }">{{ answer.userName }}</span>
                <span class="message-badge answer-badge">Answer</span>
              </div>
              <div v-else class="message-header">
                <span class="message-badge answer-badge">Answer {{ aIndex + 1 }}</span>
              </div>
              <div class="message-bubble answer-bubble" :class="{ 'clickable': allVotesReceived, 'ai-bubble': answer.isAI && allVotesReceived }" @click="allVotesReceived ? toggleCurrentAnswerExpand(aIndex) : null">
                <div class="answer-content">
                  {{ answer.answer }}
                </div>
                
                <!-- Vote Button (only if voting not complete) -->
                <div v-if="!allVotesReceived" class="vote-section">
                  <button
                    v-if="answer.userId !== currentUser?.id"
                    class="vote-btn-small"
                    :class="{ voted: hasVotedCurrent(answer) }"
                    @click.stop="voteCurrentAnswer(answer.userId)"
                  >
                    Vote
                  </button>
                  <span v-else class="your-answer-label">Your Answer</span>
                </div>
                
                <!-- Vote Results (only after all votes received) -->
                <div v-if="allVotesReceived" class="vote-section">
                  <div v-if="answer.votes && answer.votes.length > 0" class="vote-info">
                    <span class="vote-count">{{ answer.votes.length }}</span>
                    <span class="expand-arrow">{{ isCurrentAnswerExpanded(aIndex) ? '▼' : '▶' }}</span>
                  </div>
                  <span v-else class="no-votes-label">No votes</span>
                </div>
                
                <!-- Expanded Voters List (only after all votes received) -->
                <div v-if="allVotesReceived && isCurrentAnswerExpanded(aIndex) && answer.votes && answer.votes.length > 0" class="voters-list">
                  <div class="voters-title">Voted by:</div>
                  <div
                    v-for="vote in answer.votes"
                    :key="vote.userId"
                    class="voter-item"
                  >
                    {{ vote.userName }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Waiting indicator (answering phase) -->
            <div v-if="room.phase === 'answering' && (isMyTurn || hasAnswered)" class="waiting-indicator">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span class="waiting-text">Waiting for {{ room.totalAnswersExpected - room.answersCount }} answer(s)...</span>
            </div>
            
            <!-- Voting progress indicator -->
            <div v-if="room.phase === 'voting'" class="voting-progress">
              <span class="voting-text">Voting: {{ room.votedCount }} / {{ room.totalVotesExpected }} players</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Input Area -->
      <div class="chat-input-container">
        <!-- Question Input (only for current turn user in asking phase) -->
        <div v-if="isMyTurn && room.phase === 'asking'" class="input-area">
          <input
            type="text"
            v-model="questionInput"
            placeholder="Type your question here..."
            @keydown.enter.exact.prevent="submitQuestion"
          />
          <button
            class="btn btn-send"
            @click="submitQuestion"
            :disabled="!questionInput.trim()"
          >
            ➤
          </button>
        </div>
        
        <!-- Answer Input (for non-turn users in answering phase) -->
        <div v-else-if="!isMyTurn && room.phase === 'answering' && !hasAnswered" class="input-area">
          <input
            type="text"
            v-model="answerInput"
            placeholder="Type your answer here..."
            @keydown.enter.exact.prevent="submitAnswer"
          />
          <button
            class="btn btn-send"
            @click="submitAnswer"
            :disabled="!answerInput.trim()"
          >
            ➤
          </button>
        </div>
        
        <!-- Start Next Turn Button (for asker after voting is complete) -->
        <div v-else-if="isMyTurn && room.phase === 'voting' && allVotesReceived" class="input-area">
          <button
            class="btn btn-primary btn-full-width"
            @click="startNextTurn"
          >
            Start Next Turn
          </button>
        </div>
        
        <!-- Waiting messages -->
        <div v-else-if="room.phase === 'answering' && (isMyTurn || hasAnswered)" class="waiting-message-bottom">
          Waiting for all answers to arrive...
        </div>
        
        <div v-else-if="room.phase === 'voting' && !isMyTurn" class="waiting-message-bottom">
          Waiting for {{ getCurrentQuestionAuthor() }} to start the next turn...
        </div>
        
        <div v-else-if="room.phase === 'voting' && isMyTurn && !allVotesReceived" class="waiting-message-bottom">
          Waiting for all players to vote...
        </div>
        
        <!-- Ready to ask -->
        <div v-else-if="room.phase === 'asking' && !isMyTurn" class="waiting-message-bottom">
          Waiting for {{ room.users[room.currentTurn]?.name }} to ask a question...
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { socket } from '../socket'
import './Game.css'

export default {
  name: 'Game',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const code = ref(route.params.code)
    const userName = ref(route.query.userName || '')
    const questionInput = ref('')
    const answerInput = ref('')
    const error = ref('')
    const successMessage = ref('')
    const hasAnswered = ref(false)
    const sidebarOpen = ref(false)
    const expandedAnswers = ref(new Set())
    const expandedCurrentAnswers = ref(new Set())
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
    
    const sortedPlayers = computed(() => {
      // Create a copy of the users array and sort by points descending
      return [...room.value.users].sort((a, b) => {
        const pointsA = a.points || 0
        const pointsB = b.points || 0
        return pointsB - pointsA
      })
    })
    
    const isUserCurrentTurn = (user) => {
      if (room.value.users.length === 0) return false
      return room.value.users[room.value.currentTurn]?.id === user.id
    }
    
    const submitQuestion = () => {
      if (!questionInput.value.trim()) return
      
      socket.emit('submitQuestion', {
        roomCode: code.value,
        question: questionInput.value.trim()
      })
      
      questionInput.value = ''
    }
    
    const submitAnswer = () => {
      if (!answerInput.value.trim()) return
      
      socket.emit('submitAnswer', {
        roomCode: code.value,
        answer: answerInput.value.trim()
      })
      
      answerInput.value = ''
      hasAnswered.value = true
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
    
    const toggleAnswerExpand = (roundIndex, answerIndex) => {
      const key = `${roundIndex}-${answerIndex}`
      if (expandedAnswers.value.has(key)) {
        expandedAnswers.value.delete(key)
      } else {
        expandedAnswers.value.add(key)
      }
    }
    
    const isAnswerExpanded = (roundIndex, answerIndex) => {
      const key = `${roundIndex}-${answerIndex}`
      return expandedAnswers.value.has(key)
    }
    
    const toggleCurrentAnswerExpand = (answerIndex) => {
      if (expandedCurrentAnswers.value.has(answerIndex)) {
        expandedCurrentAnswers.value.delete(answerIndex)
      } else {
        expandedCurrentAnswers.value.add(answerIndex)
      }
    }
    
    const isCurrentAnswerExpanded = (answerIndex) => {
      return expandedCurrentAnswers.value.has(answerIndex)
    }
    
    const hasVoted = (answer) => {
      if (!answer.votes || !currentUser.value) return false
      return answer.votes.some(v => v.userId === currentUser.value.id)
    }
    
    const hasVotedCurrent = (answer) => {
      if (!answer.votes || !currentUser.value) return false
      return answer.votes.some(v => v.userId === currentUser.value.id)
    }
    
    const voteAnswer = (roundIndex, answerUserId) => {
      socket.emit('voteAnswer', {
        roomCode: code.value,
        roundIndex,
        answerUserId
      })
    }
    
    const voteCurrentAnswer = (answerUserId) => {
      socket.emit('voteAnswer', {
        roomCode: code.value,
        answerUserId
      })
    }
    
    const startNextTurn = () => {
      socket.emit('startNextTurn', {
        roomCode: code.value
      })
      expandedCurrentAnswers.value.clear()
    }
    
    const viewRound = (index) => {
      viewingRound.value = index
      closeSidebar()
    }
    
    const closeRoundView = () => {
      viewingRound.value = null
    }
    
    // Socket event handlers
    const handleGameState = (data) => {
      room.value = data
    }
    
    const handleUserLeft = (data) => {
      room.value = data.room
      error.value = `${data.user.name} left the game`
      setTimeout(() => {
        error.value = ''
      }, 3000)
    }
    
    const handleQuestionReceived = (data) => {
      console.log('[DEBUG] questionReceived event:', data)
      room.value = data.room
      hasAnswered.value = false
    }
    
    const handleAnswerSubmitted = (data) => {
      console.log('[DEBUG] answerSubmitted event:', data)
      room.value = data.room
    }
    
    const handleAllAnswersReceived = (data) => {
      room.value = data.room
      hasAnswered.value = false
      successMessage.value = `🎉 All answers received! Time to vote!`
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
    }
    
    const handleVoteUpdated = (data) => {
      room.value = data.room
    }
    
    const handleNextTurnStarted = (data) => {
      room.value = data.room
      hasAnswered.value = false
      successMessage.value = `🎯 Next turn: ${data.nextTurn}`
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
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
      
      // Request current game state
      socket.emit('getGameState', code.value)
      
      // Set up socket listeners
      socket.on('gameState', handleGameState)
      socket.on('userLeft', handleUserLeft)
      socket.on('questionReceived', handleQuestionReceived)
      socket.on('answerSubmitted', handleAnswerSubmitted)
      socket.on('allAnswersReceived', handleAllAnswersReceived)
      socket.on('voteUpdated', handleVoteUpdated)
      socket.on('nextTurnStarted', handleNextTurnStarted)
      socket.on('error', handleError)
    })
    
    onUnmounted(() => {
      // Clean up socket listeners
      socket.off('gameState', handleGameState)
      socket.off('userLeft', handleUserLeft)
      socket.off('questionReceived', handleQuestionReceived)
      socket.off('answerSubmitted', handleAnswerSubmitted)
      socket.off('allAnswersReceived', handleAllAnswersReceived)
      socket.off('voteUpdated', handleVoteUpdated)
      socket.off('nextTurnStarted', handleNextTurnStarted)
      socket.off('error', handleError)
    })
    
    return {
      code,
      userName,
      room,
      currentUser,
      isMyTurn,
      allVotesReceived,
      questionInput,
      answerInput,
      error,
      successMessage,
      hasAnswered,
      submitQuestion,
      submitAnswer,
      leaveGame,
      sidebarOpen,
      toggleSidebar,
      closeSidebar,
      getCurrentQuestionAuthor,
      toggleAnswerExpand,
      isAnswerExpanded,
      toggleCurrentAnswerExpand,
      isCurrentAnswerExpanded,
      hasVoted,
      hasVotedCurrent,
      voteAnswer,
      voteCurrentAnswer,
      startNextTurn,
      viewingRound,
      viewRound,
      closeRoundView,
      sortedPlayers,
      isUserCurrentTurn
    }
  }
}
</script>
