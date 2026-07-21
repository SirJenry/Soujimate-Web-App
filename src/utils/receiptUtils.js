/******************************************************************************/
/* Processing Hierarchy                                                       */
/******************************************************************************/
// getShiftDate               (1.0) Resolve the active 8:00 AM shift date.
// normalizeReceiptImageSource (2.0) Build a browser-safe receipt image source.
// getAssignedTaskList        (3.0) Resolve the user's active cleaning tasks.
// buildAssignedTaskStatuses  (4.0) Map checked tasks to Android statuses.

const SHIFT_START_HOUR = 8

/**
 * <Layer number> (1.0)
 *
 * <Processing name> getShiftDate
 * <Function> Resolve the local shift date, rolling back before 8:00 AM.
 *
 * @param {Date} referenceDate Local date and time to evaluate.
 * @return {string} Shift date in YYYY-MM-DD format.
 */
export function getShiftDate(referenceDate = new Date()) {
  const shiftDate = new Date(referenceDate)
  if (Number.isNaN(shiftDate.getTime())) return ''

  if (shiftDate.getHours() < SHIFT_START_HOUR) {
    shiftDate.setDate(shiftDate.getDate() - 1)
  }

  const year = shiftDate.getFullYear()
  const month = String(shiftDate.getMonth() + 1).padStart(2, '0')
  const day = String(shiftDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * <Layer number> (2.0)
 *
 * <Processing name> normalizeReceiptImageSource
 * <Function> Convert URLs, data URIs, and raw Base64 into an image source.
 *
 * @param {string} value Stored receipt image value.
 * @return {string} Browser-renderable image source.
 */
export function normalizeReceiptImageSource(value) {
  if (typeof value !== 'string') return ''

  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('data:') || /^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  let mimeType = 'image/jpeg'
  if (trimmed.startsWith('iVBORw0KGgo')) mimeType = 'image/png'
  else if (trimmed.startsWith('R0lGOD')) mimeType = 'image/gif'
  else if (trimmed.startsWith('UklGR')) mimeType = 'image/webp'
  else if (trimmed.startsWith('PHN2Zy') || trimmed.startsWith('PD94bWw')) {
    mimeType = 'image/svg+xml'
  }

  return `data:${mimeType};base64,${trimmed}`
}

/**
 * <Layer number> (3.0)
 *
 * <Processing name> getAssignedTaskList
 * <Function> Resolve and normalize the active rotation's cleaning tasks.
 *
 * @param {Object} profile Authenticated user's Firestore profile.
 * @return {string[]} Assigned task names in their configured order.
 */
export function getAssignedTaskList(profile = {}) {
  const rotation = profile.rotationNumber
    || profile.rotation_number
    || profile.rotation
    || ''
  const rotationTask = rotation
    ? profile[`rotation${rotation}_task`]
      || profile[`rotation${rotation}Task`]
    : ''
  const source = rotationTask
    || profile.assignedTask
    || profile.assigned_task
    || profile.assignedTasks
    || ''
  const values = Array.isArray(source)
    ? source
    : typeof source === 'object' && source !== null
      ? Object.keys(source)
      : String(source).split('|')

  return [...new Set(values
    .map((task) => String(task).trim())
    .filter((task) => task
      && !['none', 'no task'].includes(task.toLowerCase())))]
}

/**
 * <Layer number> (4.0)
 *
 * <Processing name> buildAssignedTaskStatuses
 * <Function> Match Android's Done and Pending Firestore task structure.
 *
 * @param {string[]} taskList Every task assigned to the user.
 * @param {string[]} selectedTasks Tasks checked as completed.
 * @return {Object<string, string>} Task names mapped to Done or Pending.
 */
export function buildAssignedTaskStatuses(taskList, selectedTasks) {
  const completed = new Set(selectedTasks)
  return Object.fromEntries(taskList.map((task) => [
    task,
    completed.has(task) ? 'Done' : 'Pending',
  ]))
}
