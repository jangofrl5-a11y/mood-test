import React from 'react'
import * as adhan from 'adhan'
import PrayerRing from './PrayerRing'

// Minimal PrayerSlider — single clean implementation.
// Preserves 'mood_settings' key and YYYY-MM-DD override format.

const METHOD_KEY = 'prayer_calc_method'
const MADHAB_KEY = 'prayer_madhab'

function ensureDate(v) {
  if (!v) return null
  if (v instanceof Date) return v
  try { const d = new Date(v); if (!isNaN(d.getTime())) return d } catch (e) { void e }
  return null
}

function getTodayKey() {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

export default function PrayerSlider({ onOpenCalendar }) {
  React.useEffect(() => {
    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          try {
            const lat = Number(pos.coords.latitude)
            const lon = Number(pos.coords.longitude)
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return
            const coords = new adhan.Coordinates(lat, lon)
            const params = new adhan.CalculationParameters(adhan.CalculationMethod.MuslimWorldLeague)
            params.madhab = adhan.Madhab.Shafi
              const times = new adhan.PrayerTimes(coords, new Date(), params)
              ensureDate(times.dhuhr)
          } catch (e) { void e }
        }, () => { /* denied */ }, { timeout: 8000 })
      }
    } catch (e) { void e }
  }, [])

  return (
    <div className="prayer-slider card neon-accent prayer-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Prayer times</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onOpenCalendar} className="creative-btn">Calendar</button>
          <button onClick={() => { navigator.clipboard?.writeText(getTodayKey()); }} className="creative-btn">Copy key</button>
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        {/* compute next prayer defensively */}
        <NextPrayerDisplay ensureDate={ensureDate} />
      </div>
    </div>
  )
}

function NextPrayerDisplay({ ensureDate }) {
  const [coords, setCoords] = React.useState(null)
  const [next, setNext] = React.useState(null)
  const [justCompleted, setJustCompleted] = React.useState(false)

  React.useEffect(() => {
    let mounted = true
    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          try {
            const lat = Number(pos.coords.latitude)
            const lon = Number(pos.coords.longitude)
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return
            if (!mounted) return
            setCoords({ lat, lon })
          } catch (e) { void e }
        }, () => {}, { timeout: 8000 })
      }
    } catch (e) { void e }
    return () => { mounted = false }
  }, [])

  React.useEffect(() => {
    if (!coords) return
    try {
      const c = new adhan.Coordinates(coords.lat, coords.lon)
      const params = new adhan.CalculationParameters(adhan.CalculationMethod.MuslimWorldLeague)
      params.madhab = adhan.Madhab.Shafi
      const times = new adhan.PrayerTimes(c, new Date(), params)
      const candidates = [times.fajr, times.sunrise, times.dhuhr, times.asr, times.maghrib, times.isha]
      const now = new Date()
      const valid = candidates.map(ensureDate).filter(Boolean)
      let found = null
      for (const t of valid) {
        if (t.getTime() > now.getTime()) { found = t; break }
      }
      if (!found && valid.length) {
        // if none remaining, pick fajr of next day (add 1 day)
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const t2 = new adhan.PrayerTimes(c, tomorrow, params)
        found = ensureDate(t2.fajr) || valid[0]
      }
      setNext(found)
    } catch (e) { void e }
  }, [coords, ensureDate])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <PrayerRing targetDate={next} size={88} strokeWidth={8} color="#6EE7B7" onComplete={() => {
        try { console.log('PrayerRing: completed') } catch (e) { void e }
        setJustCompleted(true)
        setTimeout(() => setJustCompleted(false), 1600)
      }} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: 'rgba(255,255,255,0.85)' }}>{next ? next.toLocaleTimeString() : '—'}</div>
        {justCompleted ? <div style={{ color: '#FFD700', fontWeight: 700, fontSize: 12 }}>Now</div> : null}
      </div>
    </div>
  )
}
