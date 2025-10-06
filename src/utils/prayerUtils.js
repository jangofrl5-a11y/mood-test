import { PrayerTimes, CalculationMethod, Coordinates, Madhab } from 'adhan'
import { ensureDate, formatDate, parseTimeToDate } from './dateHelpers'

// Lightweight seasonal estimator (fallback when adhan can't be used)
export function estimatePrayerTimesForDate(date){
  const d = ensureDate(date)
  const start = new Date(d.getFullYear(),0,0)
  const diff = d.getTime() - start.getTime()
  const oneDay = 1000*60*60*24
  const dayOfYear = Math.floor(diff/oneDay)
  const factor = Math.sin(2*Math.PI*(dayOfYear/365))
  const sunriseHour = 6 + factor * -1.25
  const sunsetHour = 18 + factor * 1.25
  const toTime = h => { const hh = Math.floor(h); const mm = Math.round((h-hh)*60); return String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0') }
  const fajr = sunriseHour - 1.5
  const dhuhr = (sunriseHour + sunsetHour)/2
  const asr = dhuhr + (sunsetHour - dhuhr) * 0.65
  const maghrib = sunsetHour
  const isha = sunsetHour + 1.5
  return { Fajr: toTime(fajr), Dhuhr: toTime(dhuhr), Asr: toTime(asr), Maghrib: toTime(maghrib), Isha: toTime(isha) }
}

function safeSnapshot(d){ try{ return { time: d.getTime(), iso: d.toISOString() } }catch{ return String(d) } }

export function computePrayerTimesForDate(date, settings){
  // Normalise/validate input date
  const isValidDateObj = x => { try{ return Object.prototype.toString.call(x) === '[object Date]' && !isNaN(x.getTime()) && typeof x.getFullYear === 'function' }catch{ return false } }
  const coerceToDate = x => {
    try{
      if(isValidDateObj(x)) return new Date(x.getTime())
      if(x && typeof x === 'object' && typeof x.toDate === 'function'){ const m = x.toDate(); if(isValidDateObj(m)) return new Date(m.getTime()) }
      if(typeof x === 'number') return new Date(x)
      if(typeof x === 'string'){ const p = new Date(x); if(!isNaN(p.getTime())) return p }
      if(x && typeof x === 'object' && (x.year || x.y) && (x.month || x.m) && (x.day || x.d || x.date)){
        const y = Number(x.year || x.y), m = Number(x.month || x.m)-1, da = Number(x.day || x.d || x.date)
        const p = new Date(y,m,da); if(!isNaN(p.getTime())) return p
      }
      const p = new Date(x); if(!isNaN(p.getTime())) return p
    }catch{ /* ignore */ }
    return new Date()
  }

  let d = ensureDate(date)
  if(!isValidDateObj(d)){
    const before = d
    d = coerceToDate(d)
    if(process.env.NODE_ENV !== 'production') console.warn('prayerUtils: coerced non-Date input to Date', { before, after: d })
  }

  const useDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const offsets = (settings && settings.prayerOffsets) || {Fajr:0,Dhuhr:0,Asr:0,Maghrib:0,Isha:0}
  const dateKey = formatDate(useDate)
  const overridesForDate = (settings && settings.prayerOverrides && settings.prayerOverrides[dateKey]) || null

  // Validate coordinates if provided
  if(settings && settings.lat != null && settings.lon != null){
    const latNum = Number(settings.lat)
    const lonNum = Number(settings.lon)
    const coordsValid = Number.isFinite(latNum) && Number.isFinite(lonNum) && Math.abs(latNum) <= 90 && Math.abs(lonNum) <= 180
    if(!coordsValid){ if(process.env.NODE_ENV !== 'production') console.warn('prayerUtils: invalid coordinates, falling back to estimator', { lat: settings.lat, lon: settings.lon }) }

    if(process.env.NODE_ENV !== 'production'){
  try{ console.debug('prayerUtils: coords check', { lat: latNum, lon: lonNum, coordsValid }) }catch{ /* ignore */ }
  try{ if(typeof window !== 'undefined') window.__prayer_last = Object.assign({}, window.__prayer_last || {}, { probe: 'coords', lat: latNum, lon: lonNum, coordsValid }) }catch{ /* ignore */ }
    }

    if(coordsValid){
      try{
        const coords = new Coordinates(latNum, lonNum)

      const methodMap = {
        MuslimWorldLeague: CalculationMethod.MuslimWorldLeague,
        UniversityOfIslamicSciencesKarachi: CalculationMethod.UniversityOfIslamicSciencesKarachi,
        IslamicSocietyOfNorthAmerica: CalculationMethod.IslamicSocietyOfNorthAmerica,
        Egypt: CalculationMethod.Egypt,
        Makkah: CalculationMethod.Makkah,
        Karachi: CalculationMethod.Karachi,
        NorthAmerica: CalculationMethod.NorthAmerica,
        Kuwait: CalculationMethod.Kuwait
      }
      const methodFn = methodMap[settings.method] || CalculationMethod.MuslimWorldLeague
      const params = methodFn()
      params.madhab = (settings.asr === 'Hanafi') ? Madhab.Hanafi : Madhab.Shafi

      // Prepare a realm-local Date to reduce cross-realm issues
      let adhanDate = coerceToDate(useDate)
      if(!isValidDateObj(adhanDate)){
        if(process.env.NODE_ENV !== 'production') console.warn('prayerUtils: adhanDate could not be coerced to a valid Date, will use estimator', { adhanDate, useDate })
        adhanDate = null
      }else adhanDate = new Date(adhanDate.getTime())

      const makeComputed = (timesObj) => {
        const apply = (dateObj, mins) => { if(!dateObj) return null; const nd = new Date(dateObj.getTime() + ((Number(mins)||0)*60000)); return nd.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) }
        const out = {
          Fajr: apply(timesObj.fajr, offsets.Fajr),
          Dhuhr: apply(timesObj.dhuhr, offsets.Dhuhr),
          Asr: apply(timesObj.asr, offsets.Asr),
          Maghrib: apply(timesObj.maghrib, offsets.Maghrib),
          Isha: apply(timesObj.isha, offsets.Isha)
        }
        if(overridesForDate){ Object.keys(out).forEach(p=> { if(overridesForDate[p]) out[p] = overridesForDate[p] }) }
        return out
      }

      // Sequence of guarded attempts to construct PrayerTimes
      const attempts = [
        // Force a guaranteed plain Date for primary attempt (local 06:00)
        { name: 'primary', date: new Date(useDate.getFullYear(), useDate.getMonth(), useDate.getDate(), 6,0,0) },
        { name: 'localMidday', date: new Date(useDate.getFullYear(), useDate.getMonth(), useDate.getDate(), 12,0,0) },
        { name: 'utcMidnight', date: new Date(Date.UTC(useDate.getFullYear(), useDate.getMonth(), useDate.getDate(), 0,0,0)) },
        { name: 'utcNoon', date: new Date(Date.UTC(useDate.getFullYear(), useDate.getMonth(), useDate.getDate(), 12,0,0)) }
      ]

      for(const at of attempts){
        let attemptDate = null
        try{
          // Robust timestamp extraction: try to derive a numeric timestamp from
          // many common wrapped/third-party date shapes (Date, moment, luxon, dayjs, etc.)
          let attempted = at.date
          let attemptTs = NaN
          try{
            if(attempted == null){ attemptTs = NaN }
            else if(typeof attempted === 'number') attemptTs = attempted
            else if(typeof attempted.getTime === 'function') attemptTs = attempted.getTime()
            else if(typeof attempted.toJSDate === 'function') attemptTs = Number(attempted.toJSDate())
            else if(typeof attempted.toDate === 'function') { const dtmp = attempted.toDate(); attemptTs = (dtmp && typeof dtmp.getTime === 'function') ? dtmp.getTime() : NaN }
            else if(typeof attempted.toMillis === 'function') attemptTs = attempted.toMillis()
            else if(typeof attempted === 'string') attemptTs = Date.parse(attempted)
            else if(typeof attempted === 'object' && (attempted.year || attempted.y) && (attempted.month || attempted.m) && (attempted.day || attempted.d || attempted.date)){
              const y = Number(attempted.year || attempted.y), m = Number(attempted.month || attempted.m)-1, da = Number(attempted.day || attempted.d || attempted.date)
              const dtmp = new Date(y,m,da); attemptTs = isNaN(dtmp.getTime()) ? NaN : dtmp.getTime()
            }else{
              // Fallback to coerceToDate which handles numbers/strings/Date-like
              const coerced = coerceToDate(attempted)
              attemptTs = coerced && typeof coerced.getTime === 'function' ? coerced.getTime() : NaN
            }
          }catch{ attemptTs = NaN }
          if(!Number.isFinite(attemptTs)){
            // invalid attempt date, skip to next
            if(process.env.NODE_ENV !== 'production'){
              try{ console.warn('prayerUtils: skipping invalid attempt date', { attempt: at.name, raw: safeSnapshot(at.date) }) }catch{ /* ignore */ }
            }
            try{
              if(typeof window !== 'undefined'){
                const prev = (window.__prayer_last && typeof window.__prayer_last === 'object') ? window.__prayer_last : {}
                const prevCount = Number(prev.errorCount) || 0
                window.__prayer_last = Object.assign({}, prev, { lastError: { when: (new Date()).toISOString(), attempt: at.name, message: 'attempt date invalid', adhanDate: safeSnapshot(at.date) }, errorCount: prevCount + 1, method: 'adhan_error' })
              }
            }catch{ /* ignore */ }
            continue
          }
          attemptDate = new Date(Number(attemptTs))
          // Dev-only detailed diagnostics: show raw vs coerced date and type info
          if(process.env.NODE_ENV !== 'production'){
            try{ console.debug('prayerUtils: attemptDate info', { name: at.name, raw: safeSnapshot(at.date), coerced: safeSnapshot(attemptDate) }) }catch{ /* ignore */ }
          }
          const times = new PrayerTimes(coords, attemptDate, params)
          const computed = makeComputed(times)
          if(process.env.NODE_ENV !== 'production'){
            try{ console.debug('prayerUtils: used adhan', { attempt: at.name, date: attemptDate.toISOString(), coords: { lat: latNum, lon: lonNum } }) }catch{ /* ignore */ }
            try{
              if(typeof window !== 'undefined'){
                window.__prayer_last = { method: 'adhan', attempt: at.name, date: attemptDate.toISOString(), coords:{lat:latNum, lon:lonNum}, errorCount: 0 }
              }
            }catch{ /* ignore */ }
          }
          return computed
        }catch(e){
          if(process.env.NODE_ENV !== 'production'){
            try{ console.warn('prayerUtils: adhan attempt failed', { attempt: at.name, err: e && e.message }) }catch{ /* ignore */ }
          }
          try{
            if(typeof window !== 'undefined'){
              const entry = {
                timestamp: (new Date()).toISOString(),
                method: 'adhan_error',
                attempt: at.name,
                message: (e && e.message) || String(e),
                adhanDate: safeSnapshot(at.date),
                coercedAttempt: (function(d){ try{ return d && d.toISOString? d.toISOString() : String(d) }catch{ return String(d) } })(attemptDate),
                attemptProbe: (function(){ try{ return { raw: safeSnapshot(at.date), coerced: safeSnapshot(attemptDate), isDateInstance: attemptDate instanceof Date, hasGetFullYear: typeof attemptDate.getFullYear === 'function', constructorName: attemptDate && attemptDate.constructor && attemptDate.constructor.name } }catch{ return null } })(),
                errorStack: (e && e.stack) ? e.stack : null
              }
              try{ if(typeof window !== 'undefined'){
                const prev = (window.__prayer_last && typeof window.__prayer_last === 'object') ? window.__prayer_last : {}
                const prevCount = Number(prev.errorCount) || 0
                window.__prayer_last = Object.assign({}, prev, { lastError: { timestamp: entry.timestamp, attempt: entry.attempt, message: entry.message }, errorCount: prevCount + 1, method: 'adhan_error' })
              } }catch{ /* ignore */ }
            }
          }catch{ /* ignore */ }
          // continue to next attempt
        }
      }
      }catch(errOuter){
        if(process.env.NODE_ENV !== 'production'){
          try{ console.error('prayerUtils: unexpected error in adhan block', errOuter) }catch{ /* ignore */ }
        }
        try{
          if(typeof window !== 'undefined'){
            try{ if(typeof window !== 'undefined'){
              const prev = (window.__prayer_last && typeof window.__prayer_last === 'object') ? window.__prayer_last : {}
              const prevCount = Number(prev.errorCount) || 0
              window.__prayer_last = Object.assign({}, prev, { lastError: { timestamp: (new Date()).toISOString(), unexpected: true, message: errOuter && errOuter.message }, errorCount: prevCount + 1, method: 'adhan_error' })
            } }catch{ /* ignore */ }
          }
        }catch{ /* ignore */ }
      }
    }
  }

  // Estimator fallback
  const est = estimatePrayerTimesForDate(date)
  const offsetsFallback = (settings && settings.prayerOffsets) || {Fajr:0,Dhuhr:0,Asr:0,Maghrib:0,Isha:0}
  const applyToEst = (hhmm, mins) => {
    const d2 = parseTimeToDate(new Date(), hhmm)
    if(!d2) return hhmm
    const nd = new Date(d2.getTime() + (Number(mins)||0)*60000)
    return nd.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
  }
  const dateKey2 = formatDate(ensureDate(date))
  const overridesForDate2 = (settings && settings.prayerOverrides && settings.prayerOverrides[dateKey2]) || null
  const out = {}
  Object.keys(est).forEach(p => { if(overridesForDate2 && overridesForDate2[p]) out[p] = overridesForDate2[p]; else out[p] = applyToEst(est[p], offsetsFallback[p]) })
  if(process.env.NODE_ENV !== 'production'){
    try{ console.debug('prayerUtils: used estimator fallback', { date: (ensureDate && ensureDate(date) && ensureDate(date).toISOString && ensureDate(date).toISOString()) || String(date) }) }catch{ /* ignore */ }
    try{
      if(typeof window !== 'undefined'){
        const prev = (window.__prayer_last && typeof window.__prayer_last === 'object') ? window.__prayer_last : {}
        const prevCount = Number(prev.errorCount) || 0
        window.__prayer_last = Object.assign({}, prev, { method: 'estimator', date: (ensureDate && ensureDate(date) && ensureDate(date).toISOString && ensureDate(date).toISOString()) || String(date), fallback: true, errorCount: prevCount })
      }
    }catch{ /* ignore */ }
  }
  return out
}

export default { estimatePrayerTimesForDate, computePrayerTimesForDate }
