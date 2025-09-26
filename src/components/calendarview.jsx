// CalendarView.jsx
import { useState, useEffect, useRef } from 'react';
import { PrayerTimes, CalculationMethod, Coordinates, SunnahTimes, Madhab } from 'adhan'
import Toast from './Toast'
import { ensureDate, formatDate, parseTimeToDate } from '../utils/dateHelpers'
import { estimatePrayerTimesForDate, computePrayerTimesForDate } from '../utils/prayerUtils'

// Define holiday detection based on Hijri month/day (uses Intl.DateTimeFormat with islamic calendar)
function getHijriParts(date){
  try{
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(date)
    const day = parts.find(p=>p.type==='day')?.value
    const month = parts.find(p=>p.type==='month')?.value
    const year = parts.find(p=>p.type==='year')?.value
    return { day: Number(day), month: (month||'').toLowerCase(), year: Number(year) }
  }catch(e){
    return null
  }
}

function detectHoliday(date){
  const h = getHijriParts(date)
  if(!h) return null
  const { day, month } = h
  // Only highlight Ramadan (entire month) and the two Eids
  if(month.includes('ram')) return { id: 'ramadan', label: 'Ramadan', prophetCelebrated: false }
  if(month.includes('shaw') && day === 1) return { id: 'eid-al-fitr', label: 'Eid al-Fitr', prophetCelebrated: true }
  if((month.includes('dhu') || month.includes('hij')) && day === 10) return { id: 'eid-al-adha', label: 'Eid al-Adha', prophetCelebrated: true }
  return null
}

export default function CalendarView({ animate }) {
  const PRAYER_EMOJI = { Fajr: '🌅', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌇', Isha: '🌙' }
  // Daily surah helpers: single canonical list and indexer so display + modal match
  const SURAH_LIST = ['Al-Fatihah','Al-Baqarah','Al-Ikhlas','Al-Falaq','An-Nas','Al-Kafirun','Al-Ma\'un']
  function getSurahIndexForDate(d = new Date()){
    try{
      const dt = ensureDate(d)
      const dateNum = dt.getDate() // 1..31
      return ((dateNum - 1) % SURAH_LIST.length + SURAH_LIST.length) % SURAH_LIST.length
    }catch(e){ return 0 }
  }
  function getDailySurah(d = new Date()){ return SURAH_LIST[getSurahIndexForDate(d)] }
  const [date, setDate] = useState(new Date());
  const [streakCount, setStreakCount] = useState(0);
  const [entries, setEntries] = useState([])
  const [openDay, setOpenDay] = useState(null)
  const [dayData, setDayData] = useState({})
  const notifyTimers = useRef({})
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [weekNotes, setWeekNotes] = useState('')
  const [settings, setSettings] = useState(()=>{
    try{
      const raw = localStorage.getItem('mood_settings')
      const base = raw ? JSON.parse(raw) : { lat: null, lon: null, notify: false, method: 'MuslimWorldLeague', asr: 'Shafi' }
      // ensure prayerOffsets and overrides exist
      base.prayerOffsets = base.prayerOffsets || { Fajr:0, Dhuhr:0, Asr:0, Maghrib:0, Isha:0 }
      base.prayerOverrides = base.prayerOverrides || {}
      return base
    }catch(e){ return { lat:null, lon:null, notify:false, method: 'MuslimWorldLeague', prayerOffsets:{Fajr:0,Dhuhr:0,Asr:0,Maghrib:0,Isha:0}, prayerOverrides:{} } }
  })
  const [overrideText, setOverrideText] = useState('')
  const [localToast, setLocalToast] = useState(null)

  // Kaaba coordinates (approx): 21.4225 N, 39.8262 E
  const KAABA = { lat: 21.4225, lon: 39.8262 }

  function toRad(deg){ return deg * Math.PI/180 }
  function toDeg(rad){ return rad * 180/Math.PI }
  // bearing from (lat1,lon1) to (lat2,lon2) in degrees from north
  function bearingTo(lat1, lon1, lat2, lon2){
    const φ1 = toRad(lat1), φ2 = toRad(lat2)
    const Δλ = toRad(lon2 - lon1)
    const y = Math.sin(Δλ) * Math.cos(φ2)
    const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ)
    const θ = Math.atan2(y, x)
    return (toDeg(θ) + 360) % 360
  }
  function haversineDistanceKm(lat1, lon1, lat2, lon2){
    const R = 6371 // km
    const φ1 = toRad(lat1), φ2 = toRad(lat2)
    const Δφ = toRad(lat2 - lat1), Δλ = toRad(lon2 - lon1)
    const a = Math.sin(Δφ/2)*Math.sin(Δφ/2) + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)*Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }
  const [onboardingSeen, setOnboardingSeen] = useState(()=>{
    try{ return localStorage.getItem('onboarding_seen') === '1' }catch(e){ return false }
  })
  const [onboardingOpen, setOnboardingOpen] = useState(()=> !onboardingSeen)
  const [selectedPrayer, setSelectedPrayer] = useState(null)
  const [surahOpen, setSurahOpen] = useState(false)
  const containerRef = useRef(null)
  const topAreaRef = useRef(null)
  const monthGridRef = useRef(null)
  const [hideTop, setHideTop] = useState(false)
  const [userHideTop, setUserHideTop] = useState(()=> localStorage.getItem('hide_header') === '1')

  // respect a user-set reduced motion preference stored in localStorage
  useEffect(()=>{
    try{
      const reduced = localStorage.getItem('reduced_motion') === '1'
      if(reduced) document.documentElement.classList.add('reduced-motion')
      else document.documentElement.classList.remove('reduced-motion')
    }catch(e){}
  },[])

  // try to get device location only after user accepts onboarding; otherwise wait
  useEffect(()=>{
    try{
      const allowed = localStorage.getItem('onboard_allow') === 'true'
      if(!allowed) return // don't auto-request geolocation unless user allowed it
      if(typeof navigator !== 'undefined' && navigator.geolocation){
        // if we already have coords in settings, skip
        if(settings && settings.lat != null && settings.lon != null) return
        navigator.geolocation.getCurrentPosition((pos)=>{
          const lat = pos.coords.latitude
          const lon = pos.coords.longitude
          const ns = {...(settings||{}), lat, lon}
          setSettings(ns)
          try{ localStorage.setItem('mood_settings', JSON.stringify(ns)) }catch(e){}
        }, (err)=>{
          // fallback to Mecca coordinates if user denies or error
          if(!(settings && settings.lat != null && settings.lon != null)){
            const ns = {...(settings||{}), lat:21.3891, lon:39.8579}
            setSettings(ns)
            try{ localStorage.setItem('mood_settings', JSON.stringify(ns)) }catch(e){}
          }
        }, { timeout: 4000 })
      }else{
        // no geolocation available - default to Mecca
        if(!(settings && settings.lat != null && settings.lon != null)){
          const ns = {...(settings||{}), lat:21.3891, lon:39.8579}
          setSettings(ns)
          try{ localStorage.setItem('mood_settings', JSON.stringify(ns)) }catch(e){}
        }
      }
    }catch(e){
      // silent fallback
    }
  }, [])

  // helper: create a GMT offset label like "GMT+3" or "GMT+3:30" for a given date
  function getGMTOffsetLabel(dt){
    try{
      const d = ensureDate(dt || Date.now())
      // getTimezoneOffset returns minutes behind UTC (negative if ahead) so invert sign
      const minutes = -d.getTimezoneOffset()
      const sign = minutes >= 0 ? '+' : '-'
      const abs = Math.abs(minutes)
      const hh = Math.floor(abs/60)
      const mm = abs % 60
      return `GMT${sign}${hh}${mm? ':' + String(mm).padStart(2,'0') : ''}`
    }catch(e){ return '' }
  }

  // Delegate estimate to shared util (keeps local file small and testable)
  function estimatePrayerTimes(date){
    return estimatePrayerTimesForDate(date)
  }

  // Delegate compute to shared util which handles adhan and fallbacks
  function computePrayerTimes(date){
    return computePrayerTimesForDate(new Date(date), settings)
  }

  useEffect(()=>{
    try{
      const raw = localStorage.getItem('mood_entries')
      const arr = raw ? JSON.parse(raw) : []
      setEntries(arr)
      // simple streak calculation: count consecutive days from today in entries
      const today = new Date();
      let streak = 0
      for(let i=0;i<30;i++){
        const d = new Date(); d.setDate(today.getDate()-i)
        const f = formatDate(d)
        if(arr.find(e=>e.createdAt && e.createdAt.startsWith(f))) streak++
        else break
      }
      setStreakCount(streak)
    }catch(e){
      console.error(e)
    }
  },[])

  // clear scheduled timers on unmount
  useEffect(()=>{
    return ()=>{
      Object.values(notifyTimers.current).forEach(id=> clearTimeout(id))
      notifyTimers.current = {}
    }
  },[])

  // Return an array of 7 dates for the week containing `date`, starting on Sunday
  function weekDates(center){
    const d = ensureDate(center)
    const day = d.getDay() // 0..6 (Sun..Sat)
    const start = new Date(d)
    start.setDate(d.getDate() - day)
    start.setHours(0,0,0,0)
    const arr = []
    for(let i=0;i<7;i++){
      const dd = new Date(start)
      dd.setDate(start.getDate() + i)
      arr.push(dd)
    }
    return arr
  }

  // Return an array of 42 dates for the month view (6 rows x 7 cols) starting from the Sunday before the 1st
  function monthDates(center){
    const d = ensureDate(center)
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1)
    const startDay = startOfMonth.getDay()
    const start = new Date(startOfMonth)
    start.setDate(startOfMonth.getDate() - startDay)
    start.setHours(0,0,0,0)
    const arr = []
    for(let i=0;i<42;i++){
      const dd = new Date(start)
      dd.setDate(start.getDate() + i)
      arr.push(dd)
    }
    return arr
  }

  // parseTimeToDate is imported from src/utils/dateHelpers.js

  function scheduleNotifyForDate(d){
    try{
      const key = 'day_data_' + formatDate(d)
      const raw = localStorage.getItem(key)
      const stored = raw ? JSON.parse(raw) : { prayers:{}, tasks:[], confirmed:false, notify:false }
      // only schedule if notify flag is true and not already confirmed
      if(!stored.notify) return
      if(stored.confirmed) return
      // schedule at Maghrib for that date
      const times = stored.prayers && Object.keys(stored.prayers).length ? stored.prayers : estimatePrayerTimes(d)
      const mag = parseTimeToDate(d, times.Maghrib)
      let when = mag
      // if maghrib already passed today, schedule for next day's maghrib
      if(!when || when.getTime() <= Date.now()){
        const next = new Date(d); next.setDate(d.getDate()+1)
        const ntimes = estimatePrayerTimes(next)
        when = parseTimeToDate(next, ntimes.Maghrib)
      }
      if(!when) return
      const ms = when.getTime() - Date.now()
      if(ms <= 0) return
      const id = setTimeout(()=>{
        const fresh = (()=>{
          const r = localStorage.getItem(key); return r? JSON.parse(r) : {confirmed:false, notify:false}
        })()
        if(!fresh.confirmed && fresh.notify){
          setLocalToast(`Reminder: you haven't confirmed prayer times for ${formatDate(d)}.`)
        }
        delete notifyTimers.current[key]
      }, ms)
      notifyTimers.current[key] = id
    }catch(e){ console.error('scheduleNotifyForDate', e) }
  }

  function clearNotifyForDate(d){
    const key = 'day_data_' + formatDate(d)
    const id = notifyTimers.current[key]
    if(id) clearTimeout(id)
    delete notifyTimers.current[key]
  }

  // Match visual container & card to the Mood page so sizes align across screens
  const containerStyle = {
    maxWidth: 1400,
    margin: '10px auto',
    padding: 22,
    // stronger, cleaner surface emphasizing the calendar as primary
    background: 'linear-gradient(135deg,#f4fff6,#eefbf6)',
    borderRadius: 12,
    boxShadow: '0 20px 50px rgba(2,6,23,0.08)',
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    color: '#0b5138'
  }

  const cardStyle = {
    background: 'linear-gradient(180deg,#ffffff,#f7fff7)',
    padding: 16,
    borderRadius: 8,
    boxShadow: '0 8px 20px rgba(2,6,23,0.06)',
    border: '1px solid rgba(4,64,36,0.06)',
    color: '#0b5138'
  }

  // load week notes whenever the week changes
  useEffect(()=>{
    try{
      const key = 'week_notes_' + formatDate(weekDates(date)[0])
      const v = localStorage.getItem(key) || ''
      setWeekNotes(v)
    }catch(e){}
  },[date])

  // Fit month grid into a 1080px viewport: compute available height and set tile sizes
  useEffect(()=>{
    function applySizing(){
      try{
        const vh = (typeof window !== 'undefined') ? window.innerHeight : 1080
        const topH = topAreaRef.current ? Math.ceil(topAreaRef.current.getBoundingClientRect().height) : 0
        const headerH = 48 // card header + paddings (shrunk)
        const margin = 18
        const available = Math.max(160, vh - topH - headerH - margin)
        if(monthGridRef.current){
          monthGridRef.current.style.maxHeight = available + 'px'
            const gap = 6
          const rows = 6
          const tileH = Math.floor((available - gap*(rows-1)) / rows)
          monthGridRef.current.querySelectorAll('.day-tile').forEach((el)=>{ el.style.minHeight = tileH + 'px'; el.style.padding = Math.max(4, Math.floor(tileH*0.08)) + 'px' })
        }
        // hide top elements if grid alone is too tall
        setHideTop((topH + headerH + 6) > (vh * 0.28))
      }catch(e){/* ignore */}
    }
    applySizing()
    window.addEventListener('resize', applySizing)
    return ()=> window.removeEventListener('resize', applySizing)
  },[date, settings])

  useEffect(()=>{
    try{ if(userHideTop) setHideTop(true); }catch(e){}
  },[userHideTop])

  // Dev debug: log date used when computing prayer times
  useEffect(()=>{
    try{
      // only in development to avoid noisy logs in production
      if(process.env.NODE_ENV !== 'production') console.log('Computing prayer times for:', date)
    }catch(e){}
  },[date])

  // helper: compute next prayer (label + time) for now
  function getNextPrayer(){
    try{
      const now = new Date()
      const todayTimes = computePrayerTimes(new Date(now))
      const order = ['Fajr','Dhuhr','Asr','Maghrib','Isha']
      for(const p of order){
        const t = parseTimeToDate(now, todayTimes[p])
        if(t && t.getTime() > Date.now()) return {label:p, time: todayTimes[p]}
      }
      const tomorrow = new Date(now); tomorrow.setDate(now.getDate()+1)
      const tomTimes = computePrayerTimes(new Date(tomorrow))
      return {label:'Fajr', time: tomTimes.Fajr}
    }catch(e){ return null }
  }

  return (
  <div ref={containerRef} style={containerStyle} className={animate? `calendar-root calendar-animate paper ${hideTop? 'hide-top':''}`:`calendar-root paper ${hideTop? 'hide-top':''}`}>
      {/* One-time onboarding modal */}
      {onboardingOpen && (
        <div className="day-modal-overlay" style={{zIndex:100000}}>
          <div className="day-modal onboarding-modal" style={{maxWidth:640}}>
            <div style={{display:'flex', gap:12, alignItems:'center'}}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <circle cx="12" cy="12" r="10" fill="#ecfdf5" stroke="#10b981" strokeWidth="0.6" />
                <path d="M12 7v5l3 3" stroke="#065f67" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <h2 style={{margin:0}}>Welcome — quick setup</h2>
                <div style={{marginTop:6}}>To provide accurate prayer times we can use your device location. This is optional. Allowing location will compute times specific to where you are.</div>
              </div>
            </div>
            <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:16}}>
              <button onClick={()=>{
                // accept and attempt geolocation
                localStorage.setItem('onboard_allow','true')
                localStorage.setItem('onboarding_seen','1')
                setOnboardingOpen(false)
                setOnboardingSeen(true)
                // trigger immediate location attempt
                if(typeof navigator !== 'undefined' && navigator.geolocation){
                  navigator.geolocation.getCurrentPosition((pos)=>{
                    const lat = pos.coords.latitude
                    const lon = pos.coords.longitude
                    const ns = {...(settings||{}), lat, lon}
                    setSettings(ns)
                    try{ localStorage.setItem('mood_settings', JSON.stringify(ns)) }catch(e){}
                    setLocalToast('Location allowed — prayer times updated')
                  }, (err)=>{ setLocalToast('Location denied or unavailable') }, { timeout: 5000 })
                }
              }} className="creative-btn">Allow location</button>
              <button onClick={()=>{
                // use default
                const ns = {...(settings||{}), lat:21.3891, lon:39.8579}
                setSettings(ns)
                try{ localStorage.setItem('mood_settings', JSON.stringify(ns)) }catch(e){}
                localStorage.setItem('onboarding_seen','1')
                setOnboardingOpen(false)
                setOnboardingSeen(true)
              }} className="btn-creative">Use default</button>
              <button onClick={()=>{ localStorage.setItem('onboarding_seen','1'); setOnboardingOpen(false); setOnboardingSeen(true); }} >Skip</button>
              <button onClick={()=>{ setOnboardingOpen(false) }} style={{background:'transparent', border:'1px solid rgba(6,95,60,0.06)', padding:'8px 10px', borderRadius:10}}>Ask later</button>
              <button onClick={()=>{
                // Always allow: mark onboarding accepted and allow geolocation without further prompt
                localStorage.setItem('onboard_allow','true')
                localStorage.setItem('onboarding_seen','1')
                setOnboardingOpen(false)
                setOnboardingSeen(true)
                if(typeof navigator !== 'undefined' && navigator.geolocation){
                  navigator.geolocation.getCurrentPosition((pos)=>{
                    const lat = pos.coords.latitude
                    const lon = pos.coords.longitude
                    const ns = {...(settings||{}), lat, lon}
                    setSettings(ns)
                    try{ localStorage.setItem('mood_settings', JSON.stringify(ns)) }catch(e){}
                    setLocalToast('Always allowed — prayer times updated')
                  }, ()=>{}, { timeout: 5000 })
                }
              }} className="creative-btn">Always allow</button>
            </div>
          </div>
        </div>
      )}
      {/* local toast for this view */}
      {localToast && <Toast message={localToast} onClose={()=>setLocalToast(null)} />}

      {/* Mini map: bottom-left (bigger, Mecca fallback) */}
      <div className="mini-map" aria-hidden>
        {(() => {
          const lat = (settings && settings.lat != null) ? Number(settings.lat) : 21.3891
          const lon = (settings && settings.lon != null) ? Number(settings.lon) : 39.8579
          const brg = (settings && settings.lat != null && settings.lon != null) ? Math.round(bearingTo(lat, lon, KAABA.lat, KAABA.lon)) : Math.round(bearingTo(lat, lon, KAABA.lat, KAABA.lon))
          const dist = haversineDistanceKm(lat, lon, KAABA.lat, KAABA.lon)
          const bbox = `${lon-0.03}%2C${lat-0.02}%2C${lon+0.03}%2C${lat+0.02}`
          const marker = `${lat}%2C${lon}`
          const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`
          return (
            <div style={{position:'relative', width:220, height:140, cursor:'pointer'}} onClick={()=> window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=10/${lat}/${lon}`, '_blank')}>
              <iframe title="mini-map" src={mapUrl} style={{border:0, width:'100%', height:'100%', borderRadius:8, filter:'grayscale(20%) contrast(95%) brightness(92%)', opacity:0.98}}></iframe>
              <div style={{position:'absolute', right:8, top:8, display:'flex', flexDirection:'column', alignItems:'center', gap:6}}>
                <div className="compass" title={`Qibla ${brg}°`} style={{width:48, height:48, borderRadius:24, display:'flex', alignItems:'center', justifyContent:'center', position:'relative'}}>
                  <div className="compass-needle" style={{transform: `rotate(${brg}deg)`, transition:'transform 300ms ease', position:'absolute'}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M12 2 L16 12 L12 9 L8 12 Z" />
                    </svg>
                  </div>
                </div>
                <div style={{background:'rgba(255,255,255,0.92)', color:'#065f67', padding:'3px 6px', borderRadius:8, fontSize:11, boxShadow:'0 6px 12px rgba(2,6,23,0.04)'}}>{dist.toFixed(0)} km</div>
              </div>
            </div>
          )
        })()}
      </div>
      {/* Top prayer circles + daily surah */}
  <div ref={topAreaRef} style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:20, marginBottom:12}}>
        <div style={{flex:1}}>
          <div className="prayer-circles" style={{display:'flex', gap:8, alignItems:'center'}}>
            {(() => {
              const todayTimes = computePrayerTimes(new Date())
              const order = ['Fajr','Dhuhr','Asr','Maghrib','Isha']
              const np = getNextPrayer()
              return order.map(p => {
                const isNext = np && np.label === p
                const time = todayTimes[p]
                return (
                  <div key={p} className={"prayer-circle" + (isNext? ' prayer-next':'')} role="button" tabIndex={0} onClick={()=>{ setSelectedPrayer(p); const today = new Date(); setDayData(prev=> ({...prev, prayers: computePrayerTimes(new Date(today))})); setOpenDay(today); }} title={p + ' ' + time} style={{minWidth:60}}>
                    <div className="prayer-circle-inner" style={{width:60, height:60}}>
                      <div className="prayer-time" style={{fontSize:12}}>{PRAYER_EMOJI[p]} {time}</div>
                    </div>
                    <div className="prayer-label" style={{fontSize:11}}>{p} {PRAYER_EMOJI[p]}</div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
        <div style={{width:220}}>
          <div className="daily-surah" style={{padding:12, borderRadius:12, background:'linear-gradient(180deg,#f7fff7,#f1fff6)', boxShadow:'0 8px 20px rgba(2,6,23,0.04)'}}>
            <div style={{fontWeight:700, marginBottom:6}}>Daily Surah</div>
            <div style={{fontSize:14, color:'#065f67', cursor:'pointer'}} onClick={()=>setSurahOpen(true)}>{getDailySurah()}</div>
            <div style={{fontSize:12, color:'#0b5138', marginTop:8}}>Reflect on a short verse today — tap to read more.</div>
          </div>
        </div>
      </div>
      {/* Surah modal */}
      {surahOpen && (
        <div className="day-modal-overlay" onClick={()=>setSurahOpen(false)}>
          <div className="day-modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>Daily Surah</h3>
            <div style={{fontSize:16, color:'#065f67', marginBottom:8}}>{getDailySurah()}</div>
            <div style={{fontSize:18, fontWeight:700, color:'#0b5138', marginTop:6}}>Arabic (short excerpt)</div>
            <div style={{fontSize:20, color:'#08392d', marginTop:6, direction:'rtl', textAlign:'right', lineHeight:1.4}}>
              {(() => {
                const excerpts = {
                  'Al-Fatihah': 'ٱلْحَمْدُ لِلّٰهِ رَبِّ ٱلْعَـلَمِينَ',
                  'Al-Ikhlas': 'قُلْ هُوَ ٱللّٰهُ أَحَدٌ',
                  'Al-Falaq': 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ',
                  'An-Nas': 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ'
                }
                const list=['Al-Fatihah','Al-Ikhlas','Al-Falaq','An-Nas']
                const idx = getSurahIndexForDate()
                return excerpts[list[idx]]
              })()}
            </div>
            <div style={{fontSize:14, marginTop:10, color:'#065f67'}}>Transliteration & translation (brief)</div>
            <div style={{fontSize:13, marginTop:6, color:'#065f67'}}>{(() => {
              const trans = {
                'Al-Fatihah': {tr:'Alhamdu lillahi rabbil alamin', en:'All praise is due to Allah, Lord of the worlds.'},
                'Al-Ikhlas': {tr:'Qul huwallahu ahad', en:'Say: He is Allah, One.'},
                'Al-Falaq': {tr:'Qul aAoodhu birabbil falaq', en:'Say: I seek refuge in the Lord of daybreak.'},
                'An-Nas': {tr:'Qul aAoodhu birabbil naas', en:'Say: I seek refuge in the Lord of mankind.'}
              }
              const list=['Al-Fatihah','Al-Ikhlas','Al-Falaq','An-Nas']
              const key = list[getSurahIndexForDate()]
              const val = trans[key]
              return (<span><em style={{color:'#08392d'}}>{val.tr}</em> — {val.en}</span>)
            })()}</div>
            <div style={{fontSize:13, marginTop:8}}><a href={'https://quran.com/' + (getSurahIndexForDate() + 1)} target="_blank" rel="noreferrer">Open tafsir / full surah</a></div>
            <div style={{display:'flex', justifyContent:'space-between', marginTop:12, gap:8}}>
              <div>
                <button onClick={()=>{
                  const txt = document.querySelector('.day-modal div[style*="direction:rtl"]')?.innerText || ''
                  try{ navigator.clipboard.writeText(txt); setLocalToast('Arabic excerpt copied to clipboard') }catch(e){ setLocalToast('Copy failed') }
                }}>Copy Arabic</button>
                <button style={{marginLeft:8}} onClick={()=>{
                  const txt = document.querySelector('.day-modal div[style*="direction:rtl"]')?.innerText || ''
                  try{ window.open('https://www.google.com/search?q=' + encodeURIComponent(txt), '_blank') }catch(e){}
                }}>Search</button>
              </div>
              <div style={{textAlign:'right'}}><button onClick={()=>setSurahOpen(false)}>Close</button></div>
            </div>
          </div>
        </div>
      )}
      {streakCount >= 7 && (
        <div style={{display:'inline-block', background:'#ffedd5', color:'#92400e', padding:'6px 10px', borderRadius:8, marginBottom:12}}>
          🌙 7-Day Gratitude Streak
        </div>
      )}

      <div style={cardStyle}>
        {/* Onboarding banner: encourage allowing location for accurate prayer times */}
        {(!settings.lat || !settings.lon) && (
          <div style={{background:'linear-gradient(90deg,#e6fff2,#f0fff9)', padding:12, borderRadius:10, marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{fontWeight:700, color:'#0b5138'}}>Allow location for accurate prayer times</div>
            <div style={{display:'flex', gap:8}}>
              <button className="creative-btn" onClick={()=>{
                if(typeof navigator !== 'undefined' && navigator.geolocation){
                  navigator.geolocation.getCurrentPosition((pos)=>{
                    const lat = pos.coords.latitude
                    const lon = pos.coords.longitude
                    const ns = {...(settings||{}), lat, lon}
                    setSettings(ns)
                    try{ localStorage.setItem('mood_settings', JSON.stringify(ns)) }catch(e){}
                    alert('Location allowed — prayer times updated')
                  }, (err)=>{ alert('Location denied or unavailable') }, { timeout: 5000 })
                } else setLocalToast('Geolocation not available')
              }}>Allow location</button>
              <button className="btn-creative" onClick={()=>{
                const ns = {...(settings||{}), lat:21.3891, lon:39.8579}
                setSettings(ns)
                try{ localStorage.setItem('mood_settings', JSON.stringify(ns)) }catch(e){}
                setLocalToast('Using default location (Mecca)')
              }}>Use default</button>
            </div>
          </div>
        )}
        {/* Month header + navigation (prev/next move by month) */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <div style={{fontWeight:700, fontSize:18}}>{date.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
          <div style={{display:'flex', gap:8}}>
            <button className="creative-btn creative-btn-prev" onClick={()=> setDate(d=> { const nd = new Date(d); nd.setMonth(d.getMonth()-1); nd.setDate(1); return nd })}>Prev</button>
            <button className="creative-btn creative-btn-next" onClick={()=> setDate(d=> { const nd = new Date(d); nd.setMonth(d.getMonth()+1); nd.setDate(1); return nd })}>Next</button>
            <button className="creative-btn creative-btn-today" onClick={()=> setDate(new Date())}>Today</button>
          </div>
        </div>

        {/* suggestion bar when notifications are off */}
        {!settings.notify && (
            <div style={{background:'#fff8f0', padding:10, borderRadius:10, marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{color:'#92400e'}}>Notifications are off — enable reminders in Settings to get notified if prayer times aren't confirmed.</div>
            <button className="btn-creative btn-shimmer" onClick={()=>setSettingsOpen(true)}>Open Settings</button>
          </div>
        )}

  {/* Month grid */}
  <div ref={monthGridRef} className="month-calendar" style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:6}}>
          {/* compute one set of prayer times for the month and reuse for each day to match user's request */}
          {(() => {
            const sampleDate = new Date(date.getFullYear(), date.getMonth(), 1)
            const monthPrayerTimes = computePrayerTimes(new Date(sampleDate))
            return monthDates(date).map((d, idx)=>{
              const key = 'day_data_' + formatDate(d)
              const raw = localStorage.getItem(key)
              const stored = raw ? JSON.parse(raw) : { prayers: monthPrayerTimes, tasks: [], confirmed:false, notify:false }
            const hijri = getHijriParts(d)
              const tileStyle = { background:'linear-gradient(180deg,#ffffff,#f6fff9)', borderRadius:6, padding:10, boxShadow:'0 10px 24px rgba(2,6,23,0.06)', border:'1px solid rgba(6,95,60,0.06)', cursor: 'pointer', color: '#0b5138', transition: 'transform .18s ease, box-shadow .18s ease', fontSize:13}
              return (
                <div
                key={key}
                role="button"
                tabIndex={0}
                  onClick={() => { setDayData(stored); setOpenDay(d); }}
                  onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDayData(stored); setOpenDay(d); } }}
                  className="day-tile"
                  style={{...tileStyle, ['--i']: idx}}
              >
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div style={{fontWeight:700, fontSize:14, color: '#114B2B'}}>{d.getDate()}</div>
                  <div style={{display:'flex', gap:6, alignItems:'center'}}>
                    {/* confirmed badge removed from UI per request; flag still persisted in storage */}
                  </div>
                </div>
                {hijri && <div style={{fontSize:10, color:'#065f67'}}>{hijri.day} {hijri.month.split(' ')[0]}</div>}
                <div style={{marginTop:4, display:'flex', flexDirection:'column', gap:4}}>
                  {['Fajr','Dhuhr','Asr','Maghrib','Isha'].map(p=> (
                    <div key={p} style={{display:'flex', justifyContent:'space-between', fontSize:11}}>
                      <div style={{color: '#0b5138', fontWeight:600, fontSize:10}}>{p}</div>
                      <div style={{fontWeight:700, color: '#0b5138', fontSize:11}}>
                        { (stored.prayers && stored.prayers[p]) || monthPrayerTimes[p] }
                        <span style={{marginLeft:6, fontSize:8, color:'#0b5138', opacity:0.85}} className="gmt-label">{getGMTOffsetLabel(d)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* day card is clickable to open details; settings moved to global modal */}
              </div>
            )
            })
          })()
          }
        </div>
        {/* Compact weekly summary removed to keep layout clean per redesign. */}
        { !hideTop && (
          <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
            <div style={{background:'#fff', padding:12, borderRadius:10, minWidth:220}}>
              <div style={{fontWeight:700, marginBottom:8}}>Weekly Summary</div>
              <div style={{fontSize:13}}>Streak: {streakCount} days</div>
              <div style={{fontSize:13, marginTop:8}}>{'Tasks this week: ' + weekDates(date).reduce((acc,d)=>{ const raw = localStorage.getItem('day_data_' + formatDate(d)); const sd = raw? JSON.parse(raw): {tasks:[]}; return acc + ((sd.tasks&&sd.tasks.length)||0) },0)}</div>
              <div style={{marginTop:10}}><button onClick={()=>{ setLocalToast('Weekly summary copied! (demo)') }}>Copy summary</button></div>
            </div>
          </div>
        )}
      </div>

  {/* Day modal */}
      {openDay && (
        <div className="day-modal-overlay" onClick={()=>setOpenDay(null)}>
          <div className="day-modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>Details for {formatDate(openDay)}</h3>
            <div style={{display:'flex', gap:12}}>
                    <div style={{flex:1}}>
                      <h4 style={{display:'flex', alignItems:'center', gap:8}}>Prayer times</h4>
                      {(() => {
                        const times = computePrayerTimes(new Date(openDay))
                        const order = ['Fajr','Dhuhr','Asr','Maghrib','Isha']
                        return (
                          <div style={{display:'flex', alignItems:'center', gap:12}}>
                            <div style={{width:80, textAlign:'center', color:'#065f67', fontWeight:700}}>Time</div>
                            <div className="timeline" style={{flex:1, position:'relative', height:320, padding:'12px 8px'}}>
                              {order.map((p,idx)=> (
                                <div key={p} className={`timeline-marker ${selectedPrayer===p? 'selected':''}`} style={{position:'absolute', left:12, right:12, top: `${(idx/(order.length-1))*100}%`, transform:'translateY(-50%)', display:'flex', alignItems:'center', gap:12}}>
                                  <div style={{width:42, height:42, borderRadius:22, background:selectedPrayer===p? 'linear-gradient(180deg,#16a34a,#0f8a3a)':'#fff', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 22px rgba(2,6,23,0.06)'}}>{PRAYER_EMOJI[p]}</div>
                                  <div style={{flex:1}}> <div style={{fontWeight:700}}>{p}</div> <div style={{fontSize:14, color:'#0b5138'}}>{times[p]} <span className="gmt-label">{getGMTOffsetLabel(openDay)}</span></div></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                      <div style={{fontSize:12, color:'#065f67', marginTop:6}}>Prayer times are computed from your device location (or default) and set by the app.</div>
                    </div>
              <div style={{flex:1}}>
                <h4>Tasks</h4>
                <ul>
                  {(dayData.tasks||[]).map((t,idx)=> (
                    <li key={idx} style={{display:'flex', justifyContent:'space-between'}}>{t} <button onClick={()=>{ setDayData(d=> ({...d, tasks: d.tasks.filter((_,i)=>i!==idx)}))}}>Remove</button></li>
                  ))}
                </ul>
                <div style={{display:'flex', gap:8, marginTop:8}}>
                  <input id="newtask" placeholder="New task" />
                  <button onClick={()=>{
                    const el = document.getElementById('newtask')
                    const v = el.value.trim()
                    if(!v) return
                    setDayData(d=> ({...d, tasks: [...(d.tasks||[]), v]}))
                    el.value = ''
                  }}>Add</button>
                </div>
                <button style={{marginTop:12}} onClick={()=>{ localStorage.setItem('day_data_' + formatDate(openDay), JSON.stringify(dayData)); setLocalToast('Saved'); }}>Save tasks</button>
              </div>
            </div>
            <div style={{textAlign:'right', marginTop:12}}><button onClick={()=>{ localStorage.removeItem('day_data_' + formatDate(openDay)); setDayData({prayers:{}, tasks:[]})}}>Reset</button> <button onClick={()=>setOpenDay(null)}>Close</button></div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <div className="day-modal-overlay" onClick={()=>setSettingsOpen(false)}>
          <div className="day-modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>Settings</h3>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              <label>Latitude</label>
              <input value={settings.lat||''} onChange={e=> setSettings(s=> ({...s, lat: e.target.value}))} placeholder="e.g. 24.7136" />
              <label>Longitude</label>
              <input value={settings.lon||''} onChange={e=> setSettings(s=> ({...s, lon: e.target.value}))} placeholder="e.g. 46.6753" />
              <label>Calculation method</label>
              <select value={settings.method} onChange={e=> setSettings(s=> ({...s, method: e.target.value}))}>
                <option>MuslimWorldLeague</option>
                <option>UniversityOfIslamicSciencesKarachi</option>
                <option>IslamicSocietyOfNorthAmerica</option>
                <option>Egypt</option>
                <option>Makkah</option>
                <option>Karachi</option>
                <option>NorthAmerica</option>
                <option>Kuwait</option>
              </select>
              <label>Asr method (Madhab)</label>
              <select value={settings.asr||'Shafi'} onChange={e=> setSettings(s=> ({...s, asr: e.target.value}))}>
                <option>Shafi</option>
                <option>Hanafi</option>
              </select>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <input id="notifyToggle" type="checkbox" checked={settings.notify} onChange={e=> setSettings(s=> ({...s, notify: e.target.checked}))} />
                <label htmlFor="notifyToggle">Enable notifications (in-app reminders)</label>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <input id="reducedMotionToggle" type="checkbox" defaultChecked={localStorage.getItem('reduced_motion') === '1'} onChange={e=>{
                  try{ localStorage.setItem('reduced_motion', e.target.checked ? '1' : '0') }catch(err){}
                  if(e.target.checked) document.documentElement.classList.add('reduced-motion')
                  else document.documentElement.classList.remove('reduced-motion')
                }} />
                <label htmlFor="reducedMotionToggle">Prefer reduced motion</label>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <input id="headerAnimateToggle" type="checkbox" checked={localStorage.getItem('header_animate') !== '0'} onChange={e=>{
                  try{ localStorage.setItem('header_animate', e.target.checked ? '1' : '0') }catch(err){}
                  if(!e.target.checked) document.documentElement.classList.add('no-header-anim')
                  else document.documentElement.classList.remove('no-header-anim')
                }} />
                <label htmlFor="headerAnimateToggle">Animate header (prayer circles)</label>
              </div>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <div style={{fontSize:13, color:'#0b5138'}}>Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone} <span className="gmt-label">{getGMTOffsetLabel()}</span></div>
                <div style={{fontSize:13, color:'#0b5138'}}>Method: {settings.method}</div>
              </div>
              <div style={{display:'flex', gap:8}}>
                <button onClick={()=>{
                  // re-run geolocation permission
                  if(typeof navigator !== 'undefined' && navigator.geolocation){
                    navigator.geolocation.getCurrentPosition((pos)=>{
                      const lat = pos.coords.latitude
                      const lon = pos.coords.longitude
                      const ns = {...(settings||{}), lat, lon}
                      setSettings(ns)
                      try{ localStorage.setItem('mood_settings', JSON.stringify(ns)) }catch(e){}
                      setLocalToast('Location updated')
                    }, (err)=>{ setLocalToast('Unable to get location: ' + (err && err.message || 'denied')) }, { timeout: 5000 })
                  } else { setLocalToast('Geolocation not available in this browser') }
                }}>Re-check device location</button>
                <button onClick={() => {
                  // migrate any custom prayer times into archive
                  try{
                    const archived = JSON.parse(localStorage.getItem('archived_prayers') || '{}')
                    // scan keys
                    Object.keys(localStorage).forEach(k=>{
                      if(k.startsWith('day_data_')){
                        try{
                          const v = JSON.parse(localStorage.getItem(k))
                          if(v && v.prayers && Object.keys(v.prayers).length){
                            archived[k] = v.prayers
                            // remove prayers from day_data but keep tasks/flags
                            const cleaned = {...v}; delete cleaned.prayers
                            localStorage.setItem(k, JSON.stringify(cleaned))
                          }
                        }catch(e){}
                      }
                    })
                    localStorage.setItem('archived_prayers', JSON.stringify(archived))
                    setLocalToast('Migration complete. Archived prayers saved.')
                  }catch(e){ setLocalToast('Migration failed: ' + e.message) }
                }}>Migrate custom prayer times to archive</button>
              </div>
              {/* archived prayers UI */}
              <div style={{marginTop:8}}>
                <div style={{fontWeight:700, marginBottom:6}}>Archived prayer times</div>
                <div style={{display:'flex', gap:8}}>
                  <button onClick={()=>{
                    try{
                      const a = JSON.parse(localStorage.getItem('archived_prayers')||'{}')
                      const keys = Object.keys(a)
                      if(keys.length===0){ setLocalToast('No archived prayer times found') ; return }
                      let out = ''
                      keys.slice(0,10).forEach(k=>{ out += k + '\n' + JSON.stringify(a[k]) + '\n\n' })
                      setLocalToast(out)
                    }catch(e){ setLocalToast('Failed to read archive') }
                  }}>View archive (first 10)</button>
                  <button onClick={()=>{ if(confirm('Clear archived prayers?')){ localStorage.removeItem('archived_prayers'); setLocalToast('Cleared') } }}>Clear archive</button>
                </div>
              </div>
              {/* prayer offsets and overrides */}
              <div style={{marginTop:8}}>
                <div style={{fontWeight:700, marginBottom:6}}>Prayer time adjustments</div>
                <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                  {['Fajr','Dhuhr','Asr','Maghrib','Isha'].map(p=> (
                    <div key={p} style={{display:'flex', flexDirection:'column', width:100}}>
                      <label style={{fontSize:12}}>{p} (min)</label>
                      <input value={settings.prayerOffsets && settings.prayerOffsets[p] != null ? settings.prayerOffsets[p] : 0} onChange={e=> setSettings(s=> ({...s, prayerOffsets: {...(s.prayerOffsets||{}), [p]: Number(e.target.value)}}))} type="number" />
                    </div>
                  ))}
                </div>
                <div style={{marginTop:8}}>
                  <div style={{fontSize:13, marginBottom:6}}>{`Paste exact times (JSON) to override computed times for specific dates. Format: {"2025-09-24":{"Fajr":"05:12","Dhuhr":"12:34"}}`}</div>
                  <textarea value={overrideText} onChange={e=> setOverrideText(e.target.value)} style={{width:'100%', minHeight:80}} placeholder='{"2025-09-24":{"Fajr":"05:12"}}'></textarea>
                  <div style={{display:'flex', gap:8, marginTop:6}}>
                    <button onClick={()=>{
                      try{
                        const parsed = JSON.parse(overrideText)
                        const ns = {...(settings||{}), prayerOverrides: {...(settings.prayerOverrides||{}), ...parsed}}
                        setSettings(ns)
                        localStorage.setItem('mood_settings', JSON.stringify(ns))
                        setLocalToast('Overrides applied')
                      }catch(e){ setLocalToast('Invalid JSON: ' + e.message) }
                    }}>Apply overrides</button>
                    <button onClick={()=>{ setOverrideText(JSON.stringify(settings.prayerOverrides || {}, null, 2)) }}>Export current overrides</button>
                  </div>
                </div>
              </div>
            </div>
            <div style={{textAlign:'right', marginTop:12}}>
              <button onClick={()=>{ setSettingsOpen(false) }}>Cancel</button>
              <button onClick={()=>{
                try{ localStorage.setItem('mood_settings', JSON.stringify(settings)) }catch(e){}
                // when enabling notify, schedule for current week days that have notify true in their data
                if(settings.notify){
                  weekDates(date).forEach(d=> scheduleNotifyForDate(d))
                } else {
                  weekDates(date).forEach(d=> clearNotifyForDate(d))
                }
                setSettingsOpen(false)
                setLocalToast('Settings saved')
              }} style={{marginLeft:8}}>Save</button>
            </div>
          </div>
        </div>
      )}
      {/* compute bearing to Kaaba and show compass if location provided */}
    </div>
  )
}