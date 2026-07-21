import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAssignedTaskStatuses,
  getAssignedTaskList,
  getShiftDate,
  normalizeReceiptImageSource,
} from '../src/utils/receiptUtils.js'

test('getShiftDate uses the previous date before 8:00 AM', () => {
  assert.equal(getShiftDate(new Date(2026, 6, 21, 7, 59)), '2026-07-20')
})

test('getShiftDate uses the current date at 8:00 AM', () => {
  assert.equal(getShiftDate(new Date(2026, 6, 21, 8, 0)), '2026-07-21')
})

test('normalizeReceiptImageSource preserves URLs and data URIs', () => {
  const url = 'https://example.com/receipt.jpg'
  const dataUri = 'data:image/jpeg;base64,abc'

  assert.equal(normalizeReceiptImageSource(url), url)
  assert.equal(normalizeReceiptImageSource(dataUri), dataUri)
})

test('normalizeReceiptImageSource prefixes legacy Base64 receipts', () => {
  assert.equal(
    normalizeReceiptImageSource('iVBORw0KGgoAAA'),
    'data:image/png;base64,iVBORw0KGgoAAA',
  )
})

test('getAssignedTaskList reads the active rotation task string', () => {
  assert.deepEqual(getAssignedTaskList({
    assignedTask: 'Fallback task',
    rotation2_task: 'Mop floor (Daily) | Clean windows (Once a week)',
    rotationNumber: 2,
  }), [
    'Mop floor (Daily)',
    'Clean windows (Once a week)',
  ])
})

test('getAssignedTaskList supports legacy fields and removes empty tasks', () => {
  assert.deepEqual(
    getAssignedTaskList({ assigned_task: 'Sweep | None | Sweep | Dust' }),
    ['Sweep', 'Dust'],
  )
})

test('buildAssignedTaskStatuses matches the Android receipt structure', () => {
  assert.deepEqual(
    buildAssignedTaskStatuses(['Sweep', 'Mop'], ['Mop']),
    { Sweep: 'Pending', Mop: 'Done' },
  )
})
