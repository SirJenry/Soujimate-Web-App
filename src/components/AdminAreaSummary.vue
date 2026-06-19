<script setup>
defineProps({
  areas: { type: Array, required: true },
})
</script>

<template>
  <section class="side-card" aria-labelledby="area-summary-title">
    <div class="admin-card-heading">
      <span class="admin-card-kicker">Coverage</span>
      <h2 id="area-summary-title" class="side-card__title">Area Summary</h2>
    </div>
    <div class="area-summary-list">
      <div v-for="area in areas" :key="area.name" class="area-summary-row">
        <span class="area-summary-row__name">
          <span
            class="area-summary-row__dot"
            :class="`area-summary-row__dot--${area.tone}`"
          />
          {{ area.name }}
        </span>
        <strong>{{ area.completed }}/{{ area.total }}</strong>
      </div>
    </div>
  </section>
</template>
