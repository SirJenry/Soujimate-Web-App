<script setup>
defineProps({
  title: { type: String, default: 'About Soujimate' },
  description: {
    type: String,
    default: 'Soujimate is a cleaning submission monitoring system that helps Superadmins track daily employee cleaning compliance across departments. This dashboard provides a quick overview of who submitted, who has not submitted, and how each department is performing.',
  },
})
</script>

<template>
  <section class="side-card" aria-labelledby="about-title">
    <h2 id="about-title" class="side-card__title">{{ title }}</h2>
    <p class="about-card__text">{{ description }}</p>
  </section>
</template>
