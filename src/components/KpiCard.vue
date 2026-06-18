<script setup>
import AppIcon from './AppIcon.vue'

defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  icon: { type: String, required: true },
  tone: { type: String, default: 'default' },
  delta: { type: String, default: '' },
  deltaTone: { type: String, default: '' },
})
</script>

<template>
  <article class="kpi-card" :class="`kpi-card--${tone}`">
    <div class="kpi-card__top">
      <span class="kpi-card__label">{{ label }}</span>
      <span class="kpi-card__icon" :class="`kpi-card__icon--${tone}`">
        <AppIcon :name="icon" />
      </span>
    </div>
    <div class="kpi-card__value-row">
      <strong class="kpi-card__value">{{ value }}</strong>
      <span v-if="delta" class="kpi-card__delta" :class="`kpi-card__delta--${deltaTone}`">
        {{ delta }}
      </span>
    </div>
  </article>
</template>
