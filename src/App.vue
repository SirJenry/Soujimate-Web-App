<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import DashboardView from '@/views/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'

const currentPath = ref(window.location.pathname)

const activeView = computed(() =>
  currentPath.value === '/dashboard' ? DashboardView : LoginView,
)

function navigate(path) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path)
  }

  currentPath.value = path
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function syncRoute() {
  currentPath.value = window.location.pathname
}

onMounted(() => window.addEventListener('popstate', syncRoute))
onBeforeUnmount(() => window.removeEventListener('popstate', syncRoute))
</script>

<template>
  <component :is="activeView" @navigate="navigate" />
</template>
