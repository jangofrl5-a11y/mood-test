import { describe, it, expect } from 'vitest'
import { computePrayerTimesForDate } from '../src/utils/prayerUtils'

function keysOK(obj){
  return ['Fajr','Dhuhr','Asr','Maghrib','Isha'].every(k=> typeof obj[k] === 'string')
}

describe('computePrayerTimesForDate edge inputs', ()=>{
  it('handles Date input', ()=>{
    const out = computePrayerTimesForDate(new Date(), {})
    expect(typeof out).toBe('object')
    expect(keysOK(out)).toBe(true)
  })

  it('handles ISO string input', ()=>{
    const iso = new Date().toISOString()
    const out = computePrayerTimesForDate(iso, {})
    expect(typeof out).toBe('object')
    expect(keysOK(out)).toBe(true)
  })

  it('handles numeric timestamp input', ()=>{
    const ts = Date.now()
    const out = computePrayerTimesForDate(ts, {})
    expect(typeof out).toBe('object')
    expect(keysOK(out)).toBe(true)
  })

  it('handles object input {year,month,day}', ()=>{
    const out = computePrayerTimesForDate({year:2025, month:9, day:25}, {})
    expect(typeof out).toBe('object')
    expect(keysOK(out)).toBe(true)
  })

  it('handles null/undefined gracefully', ()=>{
    const out1 = computePrayerTimesForDate(null, {})
    const out2 = computePrayerTimesForDate(undefined, {})
    expect(keysOK(out1)).toBe(true)
    expect(keysOK(out2)).toBe(true)
  })
})
