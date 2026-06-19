import { computed, ref, watch } from 'vue'
import { normalizeDate } from '@/composables/useDashboardData'
import { fetchAdminDashboardRecords } from '@/services/adminDashboardService'

/******************************************************************************/
/* Processing Hierarchy                                                       */
/******************************************************************************/
// getInitials          (1.0) Build employee initials.
// formatSubmissionTime (2.0) Format a Firestore timestamp.
// useAdminDashboardData (3.0) Prepare live department dashboard data.

/**
 * <Layer number> (1.0)
 *
 * <Processing name> getInitials
 * <Function> Build up to two initials from an employee name.
 *
 * @param {string} name Employee display name.
 * @return {string} Employee initials.
 */
function getInitials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0].toUpperCase()).join('') || '?'
}

/**
 * <Layer number> (2.0)
 *
 * <Processing name> formatSubmissionTime
 * <Function> Format a supported timestamp as local time.
 *
 * @param {*} value Submission timestamp.
 * @return {string} Formatted time or dash.
 */
function formatSubmissionTime(value) {
  if (!value) return '—'

  const date = typeof value?.toDate === 'function'
    ? value.toDate()
    : new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/**
 * <Layer number> (3.0)
 *
 * <Processing name> useAdminDashboardData
 * <Function> Load, filter, and summarize live Firebase department data.
 *
 * @param {string} division Authenticated Admin division.
 * @return {Object} Reactive Admin dashboard state.
 */
export function useAdminDashboardData(division) {
  const users = ref([])
  const submissions = ref([])
  const selectedDate = ref(normalizeDate(new Date()))
  const selectedArea = ref('')
  const status = ref('All')
  const search = ref('')
  const loading = ref(true)
  const error = ref('')
  let activeRequest = 0

  const submissionsByUser = computed(() => new Map(
    submissions.value.map((submission) => [submission.userId, submission]),
  ))
  const allLogs = computed(() => users.value.map((employee) => {
    const userId = employee.userId || employee.id
    const submission = submissionsByUser.value.get(userId)
    const name = [employee.firstName, employee.lastName]
      .filter(Boolean).join(' ') || employee.email || 'Unknown employee'

    return {
      id: employee.id,
      initials: getInitials(name),
      name,
      email: employee.email || '',
      area: employee.assignedArea || employee.assigned_area || 'Unassigned',
      task: employee.assignedTask || employee.assigned_task || '—',
      status: submission ? 'Submitted' : 'Missing',
      time: submission ? formatSubmissionTime(submission.timestamp) : '—',
    }
  }))
  const areaScopedLogs = computed(() => allLogs.value.filter((employee) => (
    !selectedArea.value || employee.area === selectedArea.value
  )))
  const submissionLogs = computed(() => {
    const queryText = search.value.trim().toLowerCase()

    return areaScopedLogs.value.filter((employee) => (
      (status.value === 'All' || employee.status === status.value)
      && (!queryText || employee.name.toLowerCase().includes(queryText))
    ))
  })
  const completedCount = computed(() => allLogs.value.filter(
    (employee) => employee.status === 'Submitted',
  ).length)
  const metrics = computed(() => {
    const total = areaScopedLogs.value.length
    const submitted = areaScopedLogs.value.filter(
      (employee) => employee.status === 'Submitted',
    ).length

    return [
      { label: 'Total Employees', value: String(total), icon: 'users', tone: 'default' },
      { label: 'Submitted Today', value: String(submitted), icon: 'check-circle', tone: 'green' },
      { label: 'Not Submitted', value: String(total - submitted), icon: 'alert', tone: 'red' },
      { label: 'Submission Rate', value: `${total ? ((submitted / total) * 100).toFixed(1) : '0.0'}%`, icon: 'chart', tone: 'amber' },
    ]
  })
  const areaSummary = computed(() => {
    const groups = new Map()
    allLogs.value.forEach((employee) => {
      const group = groups.get(employee.area) || {
        name: employee.area,
        completed: 0,
        total: 0,
      }
      group.total += 1
      if (employee.status === 'Submitted') group.completed += 1
      groups.set(employee.area, group)
    })

    return [...groups.values()].map((area) => ({
      ...area,
      tone: area.completed === area.total ? 'green' : 'amber',
    })).sort((left, right) => left.name.localeCompare(right.name))
  })
  const areaOptions = computed(() => areaSummary.value.map((area) => area.name))

  /**
   * <Layer number> (3.1)
   *
   * <Processing name> load
   * <Function> Load the selected date from Firebase with safe errors.
   *
   * @return {Promise<void>}
   */
  async function load() {
    const requestId = ++activeRequest
    loading.value = true
    error.value = ''

    try {
      const records = await fetchAdminDashboardRecords(
        division,
        selectedDate.value,
      )
      if (requestId !== activeRequest) return
      users.value = records.users
      submissions.value = records.submissions
    } catch (loadError) {
      if (requestId !== activeRequest) return
      console.error('Unable to load Admin dashboard data.', loadError)
      error.value = loadError?.code === 'permission-denied'
        ? 'Department data access was denied by Firestore security rules.'
        : 'Department data could not be loaded. Please try again.'
    } finally {
      if (requestId === activeRequest) loading.value = false
    }
  }

  watch(selectedDate, load, { immediate: true })

  return {
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
    totalEmployees: computed(() => allLogs.value.length),
  }
}
