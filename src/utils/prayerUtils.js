import { PrayerTimes, CalculationMethod, Coordinates, Madhab } from 'adhan'
import { ensureDate, formatDate, parseTimeToDate } from './dateHelpers'

export function estimatePrayerTimesForDate(date){
  let d = ensureDate(date)
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
  return {
    Fajr: toTime(fajr),
    Dhuhr: toTime(dhuhr),
    Asr: toTime(asr),
    Maghrib: toTime(maghrib),
    Isha: toTime(isha)
  }
}

export function computePrayerTimesForDate(date, settings){
  try{
    // coerce input into a safe Date instance that adhan expects
    let d = ensureDate(date)
    // helper to assert a real, valid Date
    function isValidDateObj(x){ return x instanceof Date && !isNaN(x.valueOf()) && typeof x.getFullYear === 'function' }
    function coerceToDate(x){
      try{
        if(isValidDateObj(x)) return new Date(x.getTime())
        if(typeof x === 'number') return new Date(x)
        if(typeof x === 'string'){
          const p = new Date(x)
          if(!isNaN(p.getTime())) return p
        }
        // accept plain objects like {year,month,day}
        if(x && typeof x === 'object' && x.year && x.month && x.day){
          const y = Number(x.year), m = Number(x.month)-1, da = Number(x.day)
          const p = new Date(y, m, da)
          if(!isNaN(p.getTime())) return p
        }
        // try a last-ditch construction (will convert numbers/strings)
        const p = new Date(x)
        if(!isNaN(p.getTime())) return p
      }catch(e){}
      return new Date()
    }
    if(!isValidDateObj(d)){
      // attempt to coerce arbitrary input to Date
      const before = d
      d = coerceToDate(d)
      if(process.env.NODE_ENV !== 'production') console.warn('prayerUtils: coerced non-Date input to Date', { before, after: d })
    }
    const useDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const offsets = (settings && settings.prayerOffsets) || {Fajr:0,Dhuhr:0,Asr:0,Maghrib:0,Isha:0}
    const overridesForDate = (settings && settings.prayerOverrides && settings.prayerOverrides[formatDate(useDate)]) || null
    if(settings && settings.lat != null && settings.lon != null){
      // validate coordinates before handing them to adhan
      const latNum = Number(settings.lat)
      const lonNum = Number(settings.lon)
      const coords = new Coordinates(latNum, lonNum)
      const coordsValid = Number.isFinite(latNum) && Number.isFinite(lonNum) && Math.abs(latNum) <= 90 && Math.abs(lonNum) <= 180
      if(!coordsValid){
        if(process.env.NODE_ENV !== 'production') console.warn('prayerUtils: invalid coordinates, falling back to estimate', { lat: settings.lat, lon: settings.lon })
        throw new Error('Invalid coordinates')
      }
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
      // ensure the value passed to PrayerTimes is a real Date
      const adhanDate = coerceToDate(useDate)
      if(!isValidDateObj(adhanDate)){
        if(process.env.NODE_ENV !== 'production') console.error('prayerUtils: adhanDate is not a valid Date, skipping adhan', { adhanDate, useDate })
        throw new Error('adhanDate invalid')
      }
      try{
        // final defensive check: call getFullYear to detect broken objects early
        if(typeof adhanDate.getFullYear !== 'function') throw new Error('adhanDate missing getFullYear')
        const times = new PrayerTimes(adhanDate, coords, params)
        const applyOffset = (dateObj, mins) => { if(!dateObj) return null; const nd = new Date(dateObj.getTime() + ((Number(mins)||0)*60000)); return nd.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) }
        const computed = {
          Fajr: applyOffset(times.fajr, offsets.Fajr),
          Dhuhr: applyOffset(times.dhuhr, offsets.Dhuhr),
          Asr: applyOffset(times.asr, offsets.Asr),
          Maghrib: applyOffset(times.maghrib, offsets.Maghrib),
          Isha: applyOffset(times.isha, offsets.Isha)
        }
        if(overridesForDate){ Object.keys(computed).forEach(p=> { if(overridesForDate[p]) computed[p] = overridesForDate[p] }) }
        return computed
      }catch(err){
        // log detailed context in development to aid debugging but fall through to fallback
        if(process.env.NODE_ENV !== 'production') console.error('prayerUtils: PrayerTimes construction failed — adhan may have received invalid date', { adhanDate, coords, params, err })
        throw err
      }
    }
  }catch(e){ console.warn('adhan compute failed', e) }
  // fallback
  const est = estimatePrayerTimesForDate(date)
  const offsetsFallback = (settings && settings.prayerOffsets) || {Fajr:0,Dhuhr:0,Asr:0,Maghrib:0,Isha:0}
  const applyToEst = (hhmm, mins) => {
    const d = parseTimeToDate(new Date(), hhmm)
    if(!d) return hhmm
    const nd = new Date(d.getTime() + (Number(mins)||0)*60000)
    return nd.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
  }
  const dateKey2 = formatDate(date)
  const overridesForDate2 = (settings && settings.prayerOverrides && settings.prayerOverrides[dateKey2]) || null
  const out = {}
  Object.keys(est).forEach(p => { if(overridesForDate2 && overridesForDate2[p]) out[p] = overridesForDate2[p]; else out[p] = applyToEst(est[p], offsetsFallback[p]) })
  return out
}



export default { estimatePrayerTimesForDate, computePrayerTimesForDate }
