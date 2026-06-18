<script setup>
import AppIcon from './AppIcon.vue'

defineProps({
  theme: { type: String, default: 'light' },
})

defineEmits(['menu', 'toggle-theme'])
</script>

<template>
  <header class="top-header">
    <div class="top-header__leading">
      <button class="menu-button" type="button" aria-label="Open navigation" @click="$emit('menu')">
        <AppIcon name="menu" />
      </button>
      <h1 class="top-header__title">Cleaning Submission Dashboard</h1>
    </div>

    <div class="top-header__actions">
      <button class="icon-button" type="button" aria-label="Notifications">
        <AppIcon name="bell" />
        <span class="notification-dot" />
      </button>
      <button
        class="icon-button"
        type="button"
        :aria-label="theme === 'dark' ? 'Use light mode' : 'Use dark mode'"
        :title="theme === 'dark' ? 'Use light mode' : 'Use dark mode'"
        @click="$emit('toggle-theme')"
      >
        <AppIcon :name="theme === 'dark' ? 'sun' : 'moon'" />
      </button>
      <div class="profile-chip">
        <span class="profile-chip__avatar" aria-hidden="true">SA</span>
        <span class="profile-chip__text">Superadmin Profile</span>
      </div>
    </div>
  </header>
</template>
