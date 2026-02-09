<template>
  <div class="mobile-header">
    <button class="hamburger-btn" @click="$emit('toggle-sidebar')">
      <span class="hamburger-icon">☰</span>
    </button>
    <h1>SpotAI</h1>
  </div>
</template>

<script>
export default {
  name: 'GameTopBar',
  emits: ['toggle-sidebar']
}
</script>

<style scoped>
/* Styles are in Game.css */
</style>
