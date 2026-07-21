<script setup>
import { ref } from "vue";
import AppIcon from "./AppIcon.vue";
import BrandMark from "./BrandMark.vue";
import { signInAuthorizedUser } from "@/services/authService";

const identifier = ref("");
const password = ref("");
const showPassword = ref(false);
const error = ref("");
const loading = ref(false);

/******************************************************************************/
/* Processing Hierarchy                                                       */
/******************************************************************************/
// submitLogin (1.0) Authenticate an authorized Firebase portal account.

/**
 * <Layer number> (1.0)
 *
 * <Processing name> submitLogin
 * <Function> Authenticate an authorized SoujiMate portal account.
 *
 * @return {Promise<void>}
 */
async function submitLogin() {
  error.value = "";
  loading.value = true;

  try {
    await signInAuthorizedUser(identifier.value, password.value);
  } catch {
    error.value = "Invalid email or password.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="login-card" aria-labelledby="login-title">
    <header class="login-card__header">
      <BrandMark login />
      <h1 id="login-title" class="login-card__title">Soujimate</h1>
      <p class="login-card__subtitle">Team Portal Login</p>
    </header>

    <form class="login-form" @submit.prevent="submitLogin">
      <label class="form-group">
        <span class="form-label">Username or email</span>
        <span class="input-shell">
          <AppIcon name="mail" />
          <input
            v-model="identifier"
            class="form-input"
            type="text"
            name="username"
            autocomplete="username"
            autocapitalize="none"
            inputmode="email"
            placeholder="Username"
            spellcheck="false"
            required
          />
        </span>
        <small class="form-hint">
          @tenseiph.com is added automatically when omitted.
        </small>
      </label>

      <label class="form-group">
        <span class="form-label-row">
          <span class="form-label">Password</span>
        </span>
        <span class="input-shell">
          <AppIcon name="lock" />
          <input
            v-model="password"
            class="form-input"
            :type="showPassword ? 'text' : 'password'"
            name="password"
            autocomplete="current-password"
            placeholder="Password"
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

      <p v-if="error" class="login-error" role="alert">{{ error }}</p>

      <button class="login-button" type="submit" :disabled="loading">
        <span>{{ loading ? "Signing in..." : "Login" }}</span>
        <AppIcon name="arrow-right" />
      </button>
    </form>

    <footer class="login-card__footer">
      <AppIcon name="shield" />
      <span>Secure access for users and administrators</span>
    </footer>
  </section>
</template>
