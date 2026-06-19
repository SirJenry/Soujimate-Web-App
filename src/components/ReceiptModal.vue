<script setup>
import { computed, ref } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  employee: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const submissionTime = computed(() => {
  if (!props.employee?.submissionTimestamp) return null
  const value = props.employee.submissionTimestamp
  const date = typeof value?.toDate === 'function'
    ? value.toDate()
    : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
})

/**
 * Convert a stored proof value into a browser-renderable image source.
 * Supports full URLs, ready-made data URIs, and raw Base64 strings
 * (which are missing the required `data:` prefix).
 *
 * @param {string} value Stored proof value.
 * @return {string} Renderable image source.
 */
function toImageSrc(value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('data:') || /^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  let mimeType = 'image/jpeg'
  if (trimmed.startsWith('iVBORw0KGgo')) mimeType = 'image/png'
  else if (trimmed.startsWith('R0lGOD')) mimeType = 'image/gif'
  else if (trimmed.startsWith('UklGR')) mimeType = 'image/webp'
  else if (trimmed.startsWith('PHN2Zy') || trimmed.startsWith('PD94bWw')) {
    mimeType = 'image/svg+xml'
  }

  return `data:${mimeType};base64,${trimmed}`
}

const viewMode = ref('scroll')

const images = computed(() => {
  if (!props.employee) return []
  const proof = props.employee.submissionProof
  if (!proof) return []
  if (Array.isArray(proof)) return proof.map(toImageSrc).filter(Boolean)
  if (typeof proof === 'string') return [toImageSrc(proof)].filter(Boolean)
  return []
})


function handleBackdropClick(event) {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="employee"
      class="receipt-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Cleaning receipt proof"
      tabindex="-1"
      @click="handleBackdropClick"
      @keydown="handleKeydown"
    >
      <div class="receipt-modal">
        <button
          class="receipt-modal__close"
          type="button"
          aria-label="Close modal"
          @click="emit('close')"
        >
          <AppIcon name="close" />
        </button>

        <header class="receipt-modal__header">
          <span class="receipt-modal__avatar">{{ employee.initials }}</span>
          <div class="receipt-modal__meta">
            <h3 class="receipt-modal__name">{{ employee.name }}</h3>
            <p v-if="employee.area && employee.area !== 'Unassigned'" class="receipt-modal__dept">
              {{ employee.area }}
            </p>
            <p v-if="submissionTime" class="receipt-modal__time">
              Submitted {{ submissionTime }}
            </p>
          </div>
        </header>

        <div class="receipt-modal__body">
          <template v-if="images.length > 0">
            <div class="receipt-modal__controls">
              <p class="receipt-modal__label">Cleaning Receipt Proof</p>
              <div class="receipt-modal__view-toggle" role="group" aria-label="View mode">
                <button
                  type="button"
                  class="receipt-modal__toggle-btn"
                  :class="{ 'receipt-modal__toggle-btn--active': viewMode === 'scroll' }"
                  :aria-pressed="viewMode === 'scroll'"
                  @click="viewMode = 'scroll'"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="14" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="1" y="6" width="14" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="1" y="11" width="14" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/>
                  </svg>
                </button>
                <button
                  type="button"
                  class="receipt-modal__toggle-btn"
                  :class="{ 'receipt-modal__toggle-btn--active': viewMode === 'grid' }"
                  :aria-pressed="viewMode === 'grid'"
                  @click="viewMode = 'grid'"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                  </svg>
                </button>
              </div>
            </div>
            <div
              class="receipt-modal__images"
              :class="{ 'receipt-modal__images--grid': viewMode === 'grid' }"
            >
              <figure
                v-for="(image, index) in images"
                :key="index"
                class="receipt-modal__image-wrapper"
                :class="{ 'receipt-modal__image-wrapper--grid': viewMode === 'grid' }"
              >
                <img
                  :src="image"
                  :alt="`Cleaning receipt ${index + 1}`"
                  class="receipt-modal__image"
                  :class="{ 'receipt-modal__image--grid': viewMode === 'grid' }"
                  loading="lazy"
                />
              </figure>
            </div>
          </template>
          <div v-else class="receipt-modal__empty">
            <AppIcon name="image" />
            <p>No cleaning receipt proof submitted.</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>