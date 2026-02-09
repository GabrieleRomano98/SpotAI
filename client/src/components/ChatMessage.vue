<template>
  <div
    v-for="(answer, index) in answers"
    :key="`answer-${index}-${answer.userId}`"
    class="message answer-message"
    :class="{ 'ai-answer': answer.isAI && showIdentity }"
  >
    <div v-if="showIdentity" class="message-header">
      <span class="message-author" :class="{ 'ai-author': answer.isAI }">{{ answer.userName }}</span>
      <span class="message-badge answer-badge">Answer</span>
    </div>
    <div v-else class="message-header">
      <span class="message-badge answer-badge">Answer {{ index + 1 }}</span>
    </div>
    <div 
      class="message-bubble answer-bubble" 
      :class="{ 
        'clickable': showIdentity, 
        'ai-bubble': answer.isAI && showIdentity 
      }" 
      @click="showIdentity ? toggleExpand(index) : null"
    >
      <div class="answer-content">
        {{ answer.answer }}
      </div>
      
      <!-- Vote Button (only if voting not complete) -->
      <div v-if="!showIdentity && showVoteButtons" class="vote-section">
        <button
          v-if="answer.userId !== currentUserId"
          class="vote-btn-small"
          :class="{ voted: hasVoted(answer), voting: votingFor === answer.userId }"
          :disabled="votingFor !== null"
          @click.stop="handleVote(answer.userId)"
        >
          {{ votingFor === answer.userId ? '...' : 'Vote' }}
        </button>
        <span v-else class="your-answer-label">Your Answer</span>
      </div>
      
      <!-- Vote Results (only after all votes received) -->
      <div v-if="showIdentity" class="vote-section">
        <div v-if="answer.votes && answer.votes.length > 0" class="vote-info">
          <span class="vote-count">{{ answer.votes.length }}</span>
          <span class="expand-arrow">{{ isExpanded(index) ? '▼' : '▶' }}</span>
        </div>
        <span v-else class="no-votes-label">No votes</span>
      </div>
      
      <!-- Expanded Voters List (only after all votes received) -->
      <div 
        v-if="showIdentity && isExpanded(index) && answer.votes && answer.votes.length > 0" 
        class="voters-list"
      >
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
</template>

<script>
import { ref } from 'vue'
import api from '../api'

export default {
  name: 'ChatMessage',
  props: {
    answers: {
      type: Array,
      required: true
    },
    showIdentity: {
      type: Boolean,
      default: false
    },
    showVoteButtons: {
      type: Boolean,
      default: false
    },
    currentUserId: {
      type: String,
      default: null
    }
  },
  emits: ['vote-success', 'vote-error'],
  setup(props, { emit }) {
    const expandedAnswers = ref(new Set())
    const votingFor = ref(null)
    
    const hasVoted = (answer) => {
      if (!answer.votes || !props.currentUserId) return false
      return answer.votes.some(v => v.userId === props.currentUserId)
    }
    
    const isExpanded = (index) => {
      return expandedAnswers.value.has(index)
    }
    
    const toggleExpand = (index) => {
      if (expandedAnswers.value.has(index)) {
        expandedAnswers.value.delete(index)
      } else {
        expandedAnswers.value.add(index)
      }
    }
    
    const handleVote = async (answerUserId) => {
      if (votingFor.value !== null) return // Prevent double-click
      
      votingFor.value = answerUserId
      
      try {
        const response = await api.submitVote(answerUserId)
        emit('vote-success', response.room)
      } catch (err) {
        emit('vote-error', err.message || 'Failed to submit vote')
      } finally {
        votingFor.value = null
      }
    }
    
    return {
      expandedAnswers,
      votingFor,
      hasVoted,
      isExpanded,
      toggleExpand,
      handleVote
    }
  }
}
</script>

<style scoped>
/* Styles are in Game.css */
</style>
