import { describe, it, expect } from 'vitest'
import { ensureDate, formatDate, parseTimeToDate } from '../src/utils/dateHelpers'

describe('dateHelpers', () => {
  it('ensureDate returns Date for ISO string', () => {
    const d = ensureDate('2025-09-24')
    expect(d instanceof Date).toBe(true)
    expect(formatDate(d)).toBe('2025-09-24')
  })

  it('ensureDate returns Date for timestamp', () => {
    const now = Date.now()
    const d = ensureDate(now)
    expect(d.getTime()).toBeGreaterThan(0)
  })

  it('ensureDate accepts y/m/d object', () => {
    const d = ensureDate({year:2025, month:9, day:24})
    expect(formatDate(d)).toBe('2025-09-24')
  })

  it('parseTimeToDate returns correct hours and minutes', () => {
    const base = new Date('2025-09-24T00:00:00Z')
    const d = parseTimeToDate(base, '05:12')
    expect(d.getHours()).toBe(5)
    expect(d.getMinutes()).toBe(12)
  })
})
