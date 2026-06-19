<script setup>
import { computed, ref } from 'vue'
import AboutCard from '@/components/AboutCard.vue'
import AdminAreaSummary from '@/components/AdminAreaSummary.vue'
import AdminDepartmentProgress from '@/components/AdminDepartmentProgress.vue'
import FilterBar from '@/components/FilterBar.vue'
import KpiCard from '@/components/KpiCard.vue'
import ReceiptModal from '@/components/ReceiptModal.vue'
import Sidebar from '@/components/Sidebar.vue'
import SubmissionTable from '@/components/SubmissionTable.vue'
import TopHeader from '@/components/TopHeader.vue'
import { useAdminDashboardData } from '@/composables/useAdminDashboardData'

const props = defineProps({
  authSession: { type: Object, required: true },
})

const emit = defineEmits(['logout'])

/******************************************************************************/
/* Processing Hierarchy                                                       */
/******************************************************************************/
// toggleTheme (1.0) Toggle and persist the dashboard theme.
// logout      (2.0) Request termination of the authenticated session.

const sidebarOpen = ref(false)
const storedTheme = window.localStorage.getItem('soujimate-theme')
const theme = ref(storedTheme || (
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
))
const selectedEmployee = ref(null)
const departmentLabel = computed(() => `${props.authSession.division} Department`)
const profileMeta = computed(() => `${props.authSession.division} Lead`)
const {
  areaOptions,
  areaSummary,
  completedCount,
  error,
  loading,
  metrics,
  search,
  selectedArea,
  selectedDate,
  status,
  submissionLogs,
  totalEmployees,
} = useAdminDashboardData(props.authSession.division)

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
function selectEmployee(employee) {
  selectedEmployee.value = employee
}

function closeModal() {
  selectedEmployee.value = null
}

function logout() {
  emit('logout')
}
</script>

<template>
  <div class="dashboard-shell admin-dashboard" :data-theme="theme">
    <button
      v-if="sidebarOpen"
      class="sidebar-scrim"
      type="button"
      aria-label="Close navigation"
      @click="sidebarOpen = false"
    />
    <Sidebar
      :open="sidebarOpen"
      portal-label="Admin Portal"
      @close="sidebarOpen = false"
      @logout="logout"
    />

    <main class="dashboard-main">
      <TopHeader
        :theme="theme"
        title="Department Cleaning Dashboard"
        :department="departmentLabel"
        avatar-text="AD"
        :profile-label="authSession.displayName"
        :profile-meta="profileMeta"
        @menu="sidebarOpen = true"
        @toggle-theme="toggleTheme"
      />

      <div class="dashboard-content">
        <section class="admin-dashboard__intro" aria-labelledby="admin-view-title">
          <div>
            <span class="admin-dashboard__eyebrow">Department workspace</span>
            <h2 id="admin-view-title">Today's cleaning overview</h2>
          </div>
          <p>Read-only monitoring for the {{ authSession.division }} team.</p>
        </section>

        <section class="kpi-grid" aria-label="Department submission overview">
          <KpiCard
            v-for="metric in metrics"
            :key="metric.label"
            v-bind="metric"
          />
        </section>

        <FilterBar
          v-model:date="selectedDate"
          v-model:area="selectedArea"
          v-model:search="search"
          v-model:status="status"
          :area-options="areaOptions"
          :show-division="false"
        />

        <div v-if="loading" class="dashboard-loading" role="status">
          <span class="dashboard-loading__spinner" aria-hidden="true" />
          <strong>Loading department data</strong>
          <span>Checking Firebase cleaning records...</span>
        </div>

        <p v-else-if="error" class="panel-card empty-state" role="alert">
          {{ error }}
        </p>

        <div v-else class="content-grid admin-content-grid">
          <SubmissionTable
            :rows="submissionLogs"
            title="Department Submission Log"
            :show-email="false"
            :show-export="false"
            @select-employee="selectEmployee"
          />

          <aside class="right-column admin-right-column" aria-label="Department details">
            <AdminDepartmentProgress
              :completed="completedCount"
              :total="totalEmployees"
              :department="departmentLabel"
            />
            <AdminAreaSummary :areas="areaSummary" />
            <AboutCard
              title="About This Dashboard"
              description="This dashboard helps department admins monitor daily cleaning submissions for their assigned department. It provides a quick overview of submitted and missing reports by employee and area."
            />
          </aside>
        </div>
      </div>
    </main>

    <ReceiptModal
      :employee="selectedEmployee"
      @close="closeModal"
    />
  </div>
</template>
