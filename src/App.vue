<script setup>
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import LoginView from '@/views/LoginView.vue'
import {
  observeAuthState,
  signOutUser,
} from '@/services/authService'

const DashboardView = defineAsyncComponent(() =>
  import('@/views/DashboardView.vue'),
)
const AdminDashboardView = defineAsyncComponent(() =>
  import('@/views/AdminDashboardView.vue'),
)
const UserReceiptView = defineAsyncComponent(() =>
  import('@/views/UserReceiptView.vue'),
)

const currentPath = ref(window.location.pathname)
const authChecked = ref(false)
const authSession = ref(null)
let unsubscribeAuth = () => {}

/******************************************************************************/
/* Processing Hierarchy                                                       */
/******************************************************************************/
// replaceRoute     (1.0) Replace the browser URL with an allowed route.
// enforceAuthRoute (2.0) Guard login and dashboard routes by auth state.
// syncRoute        (3.0) Revalidate routes after browser navigation.
// logout           (4.0) End the Firebase session and return to login.

/**
 * <Layer number> (1.0)
 *
 * <Processing name> replaceRoute
 * <Function> Replace the current browser path without a page reload.
 *
 * @param {string} path Allowed application route.
 * @return {void}
 */
function replaceRoute(path) {
  if (window.location.pathname !== path) {
    window.history.replaceState({}, '', path)
  }

  currentPath.value = path
}

/**
 * <Layer number> (2.0)
 *
 * <Processing name> enforceAuthRoute
 * <Function> Route authenticated users to dashboard and others to login.
 *
 * @return {void}
 */
function enforceAuthRoute() {
  if (!authChecked.value) return

  if (!authSession.value) {
    replaceRoute('/login')
    return
  }

  const roleRoutes = {
    Admin: '/admin/dashboard',
    SuperAdmin: '/dashboard',
    User: '/user/receipt',
  }

  replaceRoute(roleRoutes[authSession.value.role] || '/login')
}

/**
 * <Layer number> (3.0)
 *
 * <Processing name> syncRoute
 * <Function> Revalidate authentication after browser history navigation.
 *
 * @return {void}
 */
function syncRoute() {
  currentPath.value = window.location.pathname
  enforceAuthRoute()
}

/**
 * <Layer number> (4.0)
 *
 * <Processing name> logout
 * <Function> End the Firebase session and route back to login.
 *
 * @return {Promise<void>}
 */
async function logout() {
  await signOutUser()
  authSession.value = null
  enforceAuthRoute()
}

onMounted(() => {
  window.addEventListener('popstate', syncRoute)
  unsubscribeAuth = observeAuthState((session) => {
    authSession.value = session
    authChecked.value = true
    enforceAuthRoute()
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', syncRoute)
  unsubscribeAuth()
})
</script>

<template>
  <main v-if="!authChecked" class="auth-loading" role="status">
    <span class="dashboard-loading__spinner" aria-hidden="true" />
    <span>Checking secure session...</span>
  </main>
  <LoginView v-else-if="!authSession" />
  <AdminDashboardView
    v-else-if="authSession.role === 'Admin'"
    :auth-session="authSession"
    @logout="logout"
  />
  <UserReceiptView
    v-else-if="authSession.role === 'User'"
    :auth-session="authSession"
    @logout="logout"
  />
  <DashboardView v-else @logout="logout" />
</template>
