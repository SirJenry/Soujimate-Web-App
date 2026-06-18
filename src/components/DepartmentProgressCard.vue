<script setup>
defineProps({
  departments: { type: Array, required: true },
})
</script>

<template>
  <section class="side-card" aria-labelledby="departments-title">
    <h2 id="departments-title" class="side-card__title">Departments</h2>
    <div class="department-list">
      <p v-if="departments.length === 0" class="empty-state">
        No department data available.
      </p>
      <div v-for="department in departments" :key="department.name" class="department-row">
        <div class="department-row__meta">
          <span>{{ department.name }}</span>
          <span class="department-row__count">{{ department.completed }}/{{ department.total }}</span>
        </div>
        <div
          class="progress-track"
          role="progressbar"
          :aria-label="`${department.name} submission progress`"
          :aria-valuenow="department.completed"
          aria-valuemin="0"
          :aria-valuemax="department.total"
        >
          <div
            class="progress-fill"
            :class="`progress-fill--${department.tone}`"
            :style="{
              width: `${department.total
                ? (department.completed / department.total) * 100
                : 0}%`,
            }"
          />
        </div>
      </div>
    </div>
  </section>
</template>
