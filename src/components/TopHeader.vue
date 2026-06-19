<script setup>
import AppIcon from './AppIcon.vue'

defineProps({
  theme: { type: String, default: 'light' },
  title: { type: String, default: 'Cleaning Submission Dashboard' },
  department: { type: String, default: '' },
  avatarText: { type: String, default: 'SA' },
  profileLabel: { type: String, default: 'Superadmin Profile' },
  profileMeta: { type: String, default: '' },
})

defineEmits(['menu', 'toggle-theme'])
</script>

<template>
  <header class="top-header">
    <div class="top-header__leading">
      <button class="menu-button" type="button" aria-label="Open navigation" @click="$emit('menu')">
        <AppIcon name="menu" />
      </button>
      <div class="top-header__heading">
        <h1 class="top-header__title">{{ title }}</h1>
        <span v-if="department" class="department-badge">
          {{ department }}
        </span>
      </div>
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
        <span class="profile-chip__avatar" aria-hidden="true">
          {{ avatarText }}
        </span>
        <span class="profile-chip__identity">
          <strong class="profile-chip__text">{{ profileLabel }}</strong>
          <small v-if="profileMeta" class="profile-chip__meta">
            {{ profileMeta }}
          </small>
        </span>
      </div>
    </div>
  </header>
</template>
