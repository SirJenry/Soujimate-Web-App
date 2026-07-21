<script setup>
defineProps({
  login: { type: Boolean, default: false },
})
</script>

<template>
  <div class="brand__mark" :class="{ 'brand__mark--login': login }" aria-hidden="true">
    <img
      class="brand__glyph"
      src="/soujimate-app-icon.png"
      alt=""
    />
  </div>
</template>
