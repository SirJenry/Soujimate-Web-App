<script setup>
import { ref } from 'vue'
import AboutCard from '@/components/AboutCard.vue'
import DepartmentProgressCard from '@/components/DepartmentProgressCard.vue'
import FilterBar from '@/components/FilterBar.vue'
import KpiCard from '@/components/KpiCard.vue'
import Sidebar from '@/components/Sidebar.vue'
import SubmissionTable from '@/components/SubmissionTable.vue'
import TopHeader from '@/components/TopHeader.vue'
import { useDashboardData } from '@/composables/useDashboardData'

const emit = defineEmits(['logout'])

/******************************************************************************/
/* Processing Hierarchy                                                       */
/******************************************************************************/
// toggleTheme (1.0) Toggle and persist the dashboard color theme.
// logout      (2.0) Request termination of the authenticated session.

const sidebarOpen = ref(false)
const storedTheme = window.localStorage.getItem('soujimate-theme')
const theme = ref(storedTheme || (
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
))
const {
  areaOptions,
  departmentProgress,
  divisionOptions,
  error,
  loading,
  metrics,
  search,
  selectedArea,
  selectedDate,
  selectedDivision,
  status,
  submissionLogs,
} = useDashboardData()

/**
 * <Layer number> (1.0)
 *
 * <Processing name> toggleTheme
 * <Function> Toggle and persist the dashboard color theme.
 *
 * @return {void}
 */
function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  window.localStorage.setItem('soujimate-theme', theme.value)
}

/**
 * <Layer number> (2.0)
 *
 * <Processing name> logout
 * <Function> Request Firebase logout from the application shell.
 *
 * @return {void}
 */
function logout() {
  emit('logout')
}
</script>

<template>
  <div class="dashboard-shell" :data-theme="theme">
    <button
      v-if="sidebarOpen"
      class="sidebar-scrim"
      type="button"
      aria-label="Close navigation"
      @click="sidebarOpen = false"
    />
    <Sidebar :open="sidebarOpen" @close="sidebarOpen = false" @logout="logout" />

    <main class="dashboard-main">
      <TopHeader
        :theme="theme"
        @menu="sidebarOpen = true"
        @toggle-theme="toggleTheme"
      />

      <div class="dashboard-content">
        <FilterBar
          v-model:date="selectedDate"
          v-model:division="selectedDivision"
          v-model:area="selectedArea"
          v-model:search="search"
          v-model:status="status"
          :division-options="divisionOptions"
          :area-options="areaOptions"
        />

        <div
          v-if="loading"
          class="dashboard-loading"
          role="status"
          aria-live="polite"
        >
          <span class="dashboard-loading__spinner" aria-hidden="true" />
          <strong>Loading submissions</strong>
          <span>Checking daily cleaning records...</span>
        </div>

        <template v-else>
          <p v-if="error" class="panel-card empty-state" role="alert">
            {{ error }}
          </p>

          <section class="kpi-grid" aria-label="Submission overview">
            <KpiCard
              v-for="metric in metrics"
              :key="metric.label"
              v-bind="metric"
            />
          </section>

          <div class="content-grid">
            <SubmissionTable :rows="submissionLogs" />

            <aside class="right-column" aria-label="Dashboard details">
              <DepartmentProgressCard :departments="departmentProgress" />
              <AboutCard />
            </aside>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>
