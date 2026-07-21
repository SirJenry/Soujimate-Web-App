import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeLoginIdentifier,
} from '../src/utils/authUtils.js'

test('normalizeLoginIdentifier adds the Tensei domain to a username', () => {
  assert.equal(
    normalizeLoginIdentifier('john.doe'),
    'john.doe@tenseiph.com',
  )
})

test('normalizeLoginIdentifier preserves a complete email address', () => {
  assert.equal(
    normalizeLoginIdentifier('admin@tenseiph.com'),
    'admin@tenseiph.com',
  )
})

test('normalizeLoginIdentifier trims and normalizes casing', () => {
  assert.equal(
    normalizeLoginIdentifier('  SuperAdmin  '),
    'superadmin@tenseiph.com',
  )
})
