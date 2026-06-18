<script setup>
defineProps({
  login: { type: Boolean, default: false },
})
</script>

<template>
  <div class="brand__mark" :class="{ 'brand__mark--login': login }" aria-hidden="true">
    <svg class="brand__glyph" viewBox="0 0 28 28" fill="none">
      <path d="m14 2.6 7.8 5.1v12.6L14 25.4V2.6Z" :fill="login ? '#fff7d6' : '#ffb000'" />
      <path d="m14 2.6-7.8 5.1v12.6l7.8 5.1V2.6Z" :fill="login ? '#fff' : '#ff8a1f'" />
      <path d="m14 10.8 7.8-3.1L14 2.6v8.2Z" :fill="login ? '#f6e7a6' : '#ffca45'" />
    </svg>
  </div>
</template>
