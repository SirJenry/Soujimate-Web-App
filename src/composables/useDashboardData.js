import { computed, ref, watch } from 'vue'
import { fetchDashboardRecords } from '@/services/dashboardService'

/******************************************************************************/
/* Processing Hierarchy                                                       */
/******************************************************************************/
// normalizeDate          (1.0) Convert supported values to YYYY-MM-DD.
// getInitials            (2.0) Build display initials from an employee name.
// formatSubmissionTime   (3.0) Format a submission timestamp for the table.
// getTimestampValue      (4.0) Produce a sortable timestamp value.
// useDashboardData       (5.0) Prepare Firestore data for the dashboard UI.

/**
 * <Layer number> (1.0)
 *
 * <Processing name> normalizeDate
 * <Function> Convert a Firestore or JavaScript date value to YYYY-MM-DD.
 *
 * @param {*} value Date-like value.
 * @return {string} Normalized date or an empty string.
 */
export function normalizeDate(value) {
  if (!value) return ''

  if (typeof value === 'string') {
    const dateOnlyMatch = value.match(/^(\d{4}-\d{2}-\d{2})/)
    if (dateOnlyMatch) return dateOnlyMatch[1]
  }

  const date = typeof value?.toDate === 'function'
    ? value.toDate()
    : value instanceof Date
      ? value
      : new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * <Layer number> (2.0)
 *
 * <Processing name> getInitials
 * <Function> Build up to two initials for an employee avatar.
 *
 * @param {string} name Employee display name.
 * @return {string} Employee initials.
 */
function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?'
}

/**
 * <Layer number> (3.0)
 *
 * <Processing name> formatSubmissionTime
 * <Function> Format a supported timestamp as a readable local time.
 *
 * @param {*} value Submission timestamp.
 * @return {string} Formatted time or a dash.
 */
function formatSubmissionTime(value) {
  if (!value) return '-'

  const date = typeof value?.toDate === 'function'
    ? value.toDate()
    : value instanceof Date
      ? value
      : new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

/**
 * <Layer number> (4.0)
 *
 * <Processing name> getTimestampValue
 * <Function> Convert a supported timestamp into a sortable number.
 *
 * @param {*} value Submission timestamp.
 * @return {number} Millisecond timestamp or zero.
 */
function getTimestampValue(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (typeof value?.toDate === 'function') return value.toDate().getTime()

  const timestamp = value instanceof Date
    ? value.getTime()
    : new Date(value).getTime()

  return Number.isNaN(timestamp) ? 0 : timestamp
}

/**
 * <Layer number> (5.0)
 *
 * <Processing name> useDashboardData
 * <Function> Load, join, filter, and summarize dashboard Firestore data.
 *
 * @return {Object} Reactive dashboard data and filters.
 */
export function useDashboardData() {
  const today = normalizeDate(new Date())
  const users = ref([])
  const submissions = ref([])
  const selectedDate = ref(today)
  const selectedDivision = ref('')
  const selectedArea = ref('')
  const status = ref('All')
  const search = ref('')
  const loading = ref(true)
  const error = ref('')
  let activeRequest = 0

  const employees = computed(() => users.value.filter((user) => (
    user.role === 'User' && user.isActive === true
  )))

  const submissionsByUser = computed(() => {
    const matches = new Map()

    submissions.value
      .filter((submission) => (
        normalizeDate(submission.submissionDate || submission.timestamp)
          === selectedDate.value
      ))
      .forEach((submission) => {
        if (!submission.userId) return

        const current = matches.get(submission.userId)
        if (!current || getTimestampValue(submission.timestamp)
          > getTimestampValue(current.timestamp)) {
          matches.set(submission.userId, submission)
        }
      })

    return matches
  })

  const allLogs = computed(() => employees.value.map((employee) => {
    const submission = submissionsByUser.value.get(
      employee.userId || employee.id,
    )
    const name = [employee.firstName, employee.lastName]
      .filter(Boolean)
      .join(' ') || employee.email || 'Unknown employee'
    const area = employee.assignedArea
      || employee.assigned_area
      || submission?.assignedArea
      || 'Unassigned'

    return {
      id: employee.id,
      initials: getInitials(name),
      name,
      email: employee.email || '-',
      division: employee.division || '',
      area,
      task: employee.assignedTask || employee.assigned_task || '-',
      status: submission ? 'Submitted' : 'Missing',
      time: submission ? formatSubmissionTime(submission.timestamp) : '-',
    }
  }))

  const scopedLogs = computed(() => allLogs.value.filter((employee) => (
    (!selectedDivision.value
      || employee.division === selectedDivision.value)
    && (!selectedArea.value || employee.area === selectedArea.value)
  )))

  const submissionLogs = computed(() => {
    const query = search.value.trim().toLowerCase()

    return scopedLogs.value.filter((employee) => (
      (status.value === 'All' || employee.status === status.value)
      && (!query || employee.name.toLowerCase().includes(query))
    ))
  })

  const metrics = computed(() => {
    const totalEmployees = scopedLogs.value.length
    const submittedToday = scopedLogs.value.filter(
      (employee) => employee.status === 'Submitted',
    ).length
    const notSubmitted = Math.max(totalEmployees - submittedToday, 0)
    const submissionRate = totalEmployees === 0
      ? 0
      : (submittedToday / totalEmployees) * 100

    return [
      {
        label: 'Total Employees',
        value: String(totalEmployees),
        icon: 'users',
        tone: 'default',
      },
      {
        label: 'Submitted Today',
        value: String(submittedToday),
        icon: 'check-circle',
        tone: 'green',
      },
      {
        label: 'Not Submitted',
        value: String(notSubmitted),
        icon: 'alert',
        tone: 'red',
      },
      {
        label: 'Submission Rate',
        value: `${submissionRate.toFixed(1)}%`,
        icon: 'chart',
        tone: 'amber',
      },
    ]
  })

  const departmentProgress = computed(() => {
    const groups = new Map()

    allLogs.value.forEach((employee) => {
      if (!employee.division) return
      if (selectedDivision.value
        && employee.division !== selectedDivision.value) return
      if (selectedArea.value && employee.area !== selectedArea.value) return

      const group = groups.get(employee.division) || {
        name: employee.division,
        completed: 0,
        total: 0,
      }
      group.total += 1
      if (employee.status === 'Submitted') group.completed += 1
      groups.set(employee.division, group)
    })

    return [...groups.values()].map((department) => ({
      ...department,
      tone: department.completed === department.total
        ? 'green'
        : department.completed / department.total >= 0.5
          ? 'amber'
          : 'red',
    }))
  })

  const divisionOptions = computed(() => [
    ...new Set(employees.value.map((employee) => employee.division)
      .filter(Boolean)),
  ].sort())

  const areaOptions = computed(() => [
    ...new Set(employees.value
      .filter((employee) => (
        !selectedDivision.value
        || employee.division === selectedDivision.value
      ))
      .map((employee) => (
        employee.assignedArea || employee.assigned_area
      ))
      .filter(Boolean)),
  ].sort())

  /**
   * <Layer number> (5.1)
   *
   * <Processing name> load
   * <Function> Fetch dashboard records and expose safe loading errors.
   *
   * @return {Promise<void>}
   */
  async function load() {
    const requestId = ++activeRequest
    loading.value = true
    error.value = ''

    try {
      const records = await fetchDashboardRecords(selectedDate.value)
      if (requestId !== activeRequest) return

      users.value = records.users
      submissions.value = records.submissions
    } catch (loadError) {
      if (requestId !== activeRequest) return

      console.error('Unable to load dashboard data.', loadError)
      error.value = loadError?.code === 'permission-denied'
        ? 'Dashboard data access was denied by Firestore security rules.'
        : 'Dashboard data could not be loaded. Please try again.'
    } finally {
      if (requestId === activeRequest) loading.value = false
    }
  }

  watch(selectedDate, load, { immediate: true })

  return {
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
  }
}
