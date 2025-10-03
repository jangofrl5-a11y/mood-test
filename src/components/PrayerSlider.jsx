import React, { useEffect, useState } from 'react'
import * as adhan from 'adhan'

const SAMPLE_PRAYERS = [
  { id: 'fajr', label: 'Fajr', date: null },
  { id: 'dhuhr', label: 'Dhuhr', date: null },
  { id: 'asr', label: 'Asr', date: null },
  { id: 'maghrib', label: 'Maghrib', date: null },
  { id: 'isha', label: 'Isha', date: null }
]

function fmt(t){
  if(!t) return ''
  return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function buildSampleForToday(){
  // generate today sample dates at the same times used previously
  const times = ['05:05','12:30','15:45','18:10','19:30']
  const now = new Date()
  return SAMPLE_PRAYERS.map((p, i) => {
    const [h,m] = times[i].split(':').map(Number)
    const d = new Date(now)
    d.setHours(h,m,0,0)
    return { ...p, date: d, timeStr: fmt(d) }
  })
}

function getNextPrayerFromList(now, list){
  for(const p of list){
    if(p.date > now) return p
  }
  // wrap to next day (first prayer +1 day)
  const first = list[0]
  const d = new Date(first.date)
  d.setDate(d.getDate() + 1)
  return { ...first, date: d }
}

export default function PrayerSlider({ onOpenCalendar }){
  const [now, setNow] = useState(new Date())
  const [prayers, setPrayers] = useState(() => buildSampleForToday())
  const [next, setNext] = useState(() => getNextPrayerFromList(new Date(), buildSampleForToday()))

  const METHOD_KEY = 'prayer_calc_method'
  const MADHAB_KEY = 'prayer_madhab'

  const calcOptions = {
    'MuslimWorldLeague': adhan.CalculationMethod.MuslimWorldLeague,
    'UmmAlQura': adhan.CalculationMethod.UmmAlQura,
    'ISNA': adhan.CalculationMethod.ISNA,
    'Egypt': adhan.CalculationMethod.Egypt,
    'Karachi': adhan.CalculationMethod.Karachi,
    'Tehran': adhan.CalculationMethod.Tehran
  }

  const [method, setMethod] = useState(()=> localStorage.getItem(METHOD_KEY) || 'MuslimWorldLeague')
  const [madhab, setMadhab] = useState(()=> localStorage.getItem(MADHAB_KEY) || 'Shafi')

  useEffect(()=>{
    // load any manual overrides first (only applies to the exact date provided)
    const loadManual = async () => {
      try{
        const resp = await fetch('/manual_prayer_times.json', { cache: 'no-store' })
        if(!resp.ok) throw new Error('no manual file')
        const json = await resp.json()
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth()+1).padStart(2,'0')
        const dd = String(today.getDate()).padStart(2,'0')
        const todayKey = `${yyyy}-${mm}-${dd}`
        const override = (json.overrides || []).find(o => o.date === todayKey)
        if(override && override.times){
          // build today's prayer list from override strings (HH:MM)
          const now = new Date()
          const built = ['fajr','dhuhr','asr','maghrib','isha'].map((id, i) => {
            const ts = override.times[id]
            if(!ts) return { id, label: id.charAt(0).toUpperCase()+id.slice(1), date: null, timeStr: '' }
            const [h,m] = ts.split(':').map(Number)
            const d = new Date(now)
            d.setHours(h||0, m||0, 0, 0)
            return { id, label: id === 'dhuhr' ? 'Dhuhr' : id.charAt(0).toUpperCase()+id.slice(1), date: d, timeStr: fmt(d) }
          })
          setPrayers(built)
          setNext(getNextPrayerFromList(new Date(), built))
          return true
        }
      }catch(e){
        // ignore and continue to compute via adhan
      }
      return false
    }

    (async ()=>{
      const didManual = await loadManual()

      // if no manual override applied, compute with adhan for today
      if(!didManual){
      // try to get geolocation and compute prayer times with adhan
      if(navigator && navigator.geolocation){
        const success = (pos) => {
          try{
            const coords = new adhan.Coordinates(pos.coords.latitude, pos.coords.longitude)
            const params = new adhan.CalculationParameters(calcOptions[method]())
            // set madhab
            params.madhab = madhab === 'Hanafi' ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi
            const today = new Date()
            const times = new adhan.PrayerTimes(coords, today, params)
            const built = [
              { id:'fajr', label:'Fajr', date: times.fajr, timeStr: fmt(times.fajr) },
              { id:'dhuhr', label:'Dhuhr', date: times.dhuhr, timeStr: fmt(times.dhuhr) },
              { id:'asr', label:'Asr', date: times.asr, timeStr: fmt(times.asr) },
              { id:'maghrib', label:'Maghrib', date: times.maghrib, timeStr: fmt(times.maghrib) },
              { id:'isha', label:'Isha', date: times.isha, timeStr: fmt(times.isha) }
            ]
            setPrayers(built)
            setNext(getNextPrayerFromList(new Date(), built))
          }catch(e){
            // fallback to sample
            setPrayers(buildSampleForToday())
            setNext(getNextPrayerFromList(new Date(), buildSampleForToday()))
          }
        }
        const error = ()=>{
          setPrayers(buildSampleForToday())
          setNext(getNextPrayerFromList(new Date(), buildSampleForToday()))
        }
        navigator.geolocation.getCurrentPosition(success, error, { maximumAge: 60*60*1000, timeout: 8000 })
      } else {
        setPrayers(buildSampleForToday())
        setNext(getNextPrayerFromList(new Date(), buildSampleForToday()))
      }
      }
    })()
  }, [])

  useEffect(()=>{
    const id = setInterval(()=>{
      const n = new Date()
      setNow(n)
      setNext(getNextPrayerFromList(n, prayers))
    }, 1000)
    return ()=>clearInterval(id)
  }, [prayers])

  const remainingMs = next.date - now
  const minutes = Math.max(0, Math.floor((remainingMs / 60000) % 60))
  const hours = Math.max(0, Math.floor(remainingMs / 3600000))
  const seconds = Math.max(0, Math.floor((remainingMs / 1000) % 60))

  return (
    <div className="prayer-slider" style={{maxWidth:920, margin:'8px auto 20px', padding:18, borderRadius:16, background:'linear-gradient(180deg,#ffffff,#f6fff8)', boxShadow:'0 14px 40px rgba(2,6,23,0.06)', display:'flex', alignItems:'center', gap:18}}>
      <div style={{width:96, height:96, borderRadius:12, background:'linear-gradient(180deg,#e6fff2,#f1fff6)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 10px 28px rgba(16,185,129,0.08)'}} aria-hidden>
        <div style={{fontSize:44}}>🕋</div>
      </div>

      <div style={{flex:1}}>
        <div style={{display:'flex', gap:12, justifyContent:'flex-end', marginBottom:8}}>
          <label style={{fontSize:12, color:'#065f67', display:'flex', gap:8, alignItems:'center'}}>
            <span style={{fontWeight:700}}>Method</span>
            <select value={method} onChange={(e)=>{ setMethod(e.target.value); localStorage.setItem(METHOD_KEY, e.target.value); window.location.reload(); }} style={{borderRadius:8, padding:6}}>
              {Object.keys(calcOptions).map(k=> <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label style={{fontSize:12, color:'#065f67', display:'flex', gap:8, alignItems:'center'}}>
            <span style={{fontWeight:700}}>Madhab</span>
            <select value={madhab} onChange={(e)=>{ setMadhab(e.target.value); localStorage.setItem(MADHAB_KEY, e.target.value); window.location.reload(); }} style={{borderRadius:8, padding:6}}>
              <option value="Shafi">Shafi</option>
              <option value="Hanafi">Hanafi</option>
            </select>
          </label>
        </div>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
          <div>
            <div style={{fontWeight:800, fontSize:18}}>Next prayer</div>
            <div style={{marginTop:4, color:'#065f67', fontWeight:700}}>{next.label} — {next.timeStr || fmt(next.date)}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:22, fontWeight:900}}>{hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${seconds}s`}</div>
            <div style={{fontSize:12, color:'#0b5138', marginTop:6}}>starts in</div>
          </div>
        </div>

        <div style={{marginTop:12, display:'flex', gap:12, alignItems:'center'}}>
          <button className="creative-btn" onClick={onOpenCalendar} aria-label="Open calendar">View calendar</button>
          <button className="creative-btn" style={{background:'linear-gradient(180deg,#ffffff,#f3fff8)', color:'#065f67', boxShadow:'0 10px 24px rgba(2,6,23,0.04)'}}>Prayer times</button>
        </div>
      </div>
    </div>
  )
}
