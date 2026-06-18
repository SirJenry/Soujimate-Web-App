<script setup>
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'
import BrandMark from './BrandMark.vue'

const emit = defineEmits(['login'])

const email = ref('admin@soujimate.com')
const password = ref('soujimate')
const showPassword = ref(false)

function submitLogin() {
  // TODO: Replace this mock navigation with Firebase authentication and SuperAdmin role validation.
  emit('login')
}
</script>

<template>
  <section class="login-card" aria-labelledby="login-title">
    <header class="login-card__header">
      <BrandMark login />
      <h1 id="login-title" class="login-card__title">Soujimate</h1>
      <p class="login-card__subtitle">Superadmin Login</p>
    </header>

    <form class="login-form" @submit.prevent="submitLogin">
      <label class="form-group">
        <span class="form-label">Email address</span>
        <span class="input-shell">
          <AppIcon name="mail" />
          <input
            v-model="email"
            class="form-input"
            type="email"
            name="email"
            autocomplete="email"
            required
          />
        </span>
      </label>

      <label class="form-group">
        <span class="form-label-row">
          <span class="form-label">Password</span>
          <button class="forgot-link" type="button">Forgot password?</button>
        </span>
        <span class="input-shell">
          <AppIcon name="lock" />
          <input
            v-model="password"
            class="form-input"
            :type="showPassword ? 'text' : 'password'"
            name="password"
            autocomplete="current-password"
            required
          />
          <button
            class="password-toggle"
            type="button"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click="showPassword = !showPassword"
          >
            <AppIcon :name="showPassword ? 'eye-off' : 'eye'" />
          </button>
        </span>
      </label>

      <button class="login-button" type="submit">
        <span>Login</span>
        <AppIcon name="arrow-right" />
      </button>
    </form>

    <footer class="login-card__footer">
      <AppIcon name="shield" />
      <span>Superadmin access only</span>
    </footer>
  </section>
</template>
