<template>
  <div class="chat-input-container">
    <!-- Question Input (only for current turn user in asking phase) -->
    <div v-if="isMyTurn && phase === 'asking'" class="input-area">
      <input
        type="text"
        v-model="inputValue"
        placeholder="Type your question here..."
        @keydown.enter.exact.prevent="handleSubmit"
        :disabled="isSubmitting"
      />
      <button
        class="btn btn-send"
        @click="handleSubmit"
        :disabled="!inputValue.trim() || isSubmitting"
      >
        {{ isSubmitting ? '...' : '➤' }}
      </button>
    </div>
    
    <!-- Answer Input (for non-turn users in answering phase) -->
    <div v-else-if="!isMyTurn && phase === 'answering' && !hasAnswered" class="input-area">
      <input
        type="text"
        v-model="inputValue"
        placeholder="Type your answer here..."
        @keydown.enter.exact.prevent="handleSubmit"
        :disabled="isSubmitting"
      />
      <button
        class="btn btn-send"
        @click="handleSubmit"
        :disabled="!inputValue.trim() || isSubmitting"
      >
        {{ isSubmitting ? '...' : '➤' }}
      </button>
    </div>
    
    <!-- Start Next Turn Button (for asker after voting is complete) -->
    <div v-else-if="isMyTurn && phase === 'voting' && allVotesReceived" class="input-area">
      <button
        class="btn btn-primary btn-full-width"
        @click="handleNextTurn"
      >
        Start Next Turn
      </button>
    </div>
    
    <!-- Waiting messages -->
    <div v-if="phase === 'answering' && (isMyTurn || hasAnswered)" class="waiting-message-bottom">
      Waiting for all answers to arrive...
    </div>
    
    <div v-else-if="phase === 'voting' && !isMyTurn" class="waiting-message-bottom">
      Waiting for {{ currentQuestionAuthor }} to start the next turn...
    </div>
    
    <div v-else-if="phase === 'voting' && isMyTurn && !allVotesReceived" class="waiting-message-bottom">
      Waiting for all players to vote...
    </div>
    
    <!-- Ready to ask -->
    <div v-else-if="phase === 'asking' && !isMyTurn" class="waiting-message-bottom">
      Waiting for {{ currentQuestionAuthor }} to ask a question...
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import api from '../api'

export default {
  name: 'ChatInput',
  props: {
    isMyTurn: {
      type: Boolean,
      required: true
    },
    phase: {
      type: String,
      required: true
    },
    hasAnswered: {
      type: Boolean,
      default: false
    },
    allVotesReceived: {
      type: Boolean,
      default: false
    },
    currentQuestionAuthor: {
      type: String,
      default: 'Unknown'
    }
  },
  emits: ['submit-success', 'submit-error', 'next-turn-success', 'next-turn-error'],
  setup(props, { emit }) {
    const inputValue = ref('')
    const isSubmitting = ref(false)
    
    const handleSubmit = async () => {
      if (!inputValue.value.trim() || isSubmitting.value) return
      
      isSubmitting.value = true
      const text = inputValue.value.trim()
      inputValue.value = ''
      
      try {
        let response
        if (props.isMyTurn && props.phase === 'asking') {
          response = await api.submitQuestion(text)
        } else if (!props.isMyTurn && props.phase === 'answering' && !props.hasAnswered) {
          response = await api.submitAnswer(text)
        }
        
        if (response) {
          emit('submit-success', response.room)
        }
      } catch (err) {
        emit('submit-error', err.message || 'Failed to submit')
        inputValue.value = text // Restore input on error
      } finally {
        isSubmitting.value = false
      }
    }
    
    const handleNextTurn = async () => {
      try {
        const response = await api.nextTurn()
        emit('next-turn-success', response.room)
      } catch (err) {
        emit('next-turn-error', err.message || 'Failed to start next turn')
      }
    }
    
    return {
      inputValue,
      isSubmitting,
      handleSubmit,
      handleNextTurn
    }
  }
}
</script>

<style scoped>
/* Styles are in Game.css */
</style>
