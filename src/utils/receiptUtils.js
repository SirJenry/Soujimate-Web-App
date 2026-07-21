/******************************************************************************/
/* Processing Hierarchy                                                       */
/******************************************************************************/
// getShiftDate               (1.0) Resolve the active 8:00 AM shift date.
// normalizeReceiptImageSource (2.0) Build a browser-safe receipt image source.

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
