<script setup>
import LoginCard from '@/components/LoginCard.vue'

defineEmits(['navigate'])
</script>

<template>
  <main class="login-page">
    <LoginCard @login="$emit('navigate', '/dashboard')" />
  </main>
</template>
