<script setup>
import AppIcon from './AppIcon.vue'
import BrandMark from './BrandMark.vue'

defineProps({
  open: { type: Boolean, default: false },
  portalLabel: { type: String, default: 'Superadmin Portal' },
})

defineEmits(['logout', 'close'])
</script>

<template>
  <aside class="sidebar" :class="{ 'is-open': open }" aria-label="Main navigation">
    <div class="sidebar__brand brand">
      <BrandMark />
      <div>
        <p class="brand__name">Soujimate</p>
        <p class="brand__subtitle">{{ portalLabel }}</p>
      </div>
    </div>

    <nav class="sidebar__nav">
      <button class="nav-item nav-item--active" type="button" @click="$emit('close')">
        <AppIcon name="grid" />
        <span>Dashboard</span>
      </button>
    </nav>

    <button class="sidebar__logout" type="button" @click="$emit('logout')">
      <AppIcon name="logout" />
      <span>Logout</span>
    </button>
  </aside>
</template>
