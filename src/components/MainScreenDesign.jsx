import React, { useEffect, useState } from 'react'
import { computePrayerTimesForDate, estimatePrayerTimesForDate } from '../utils/prayerUtils'

function Circle({ label='FAJR', time='00:15:10' }){
  return (
    <div style={{display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', marginTop:6}}>
      <div style={{position:'relative', width:260, height:260, display:'flex', alignItems:'center', justifyContent:'center'}}>
        {/* outer soft rings */}
        <div style={{position:'absolute', width:320, height:320, borderRadius:9999, border:'6px solid rgba(250,204,21,0.06)', filter:'blur(6px)'}} />
        <div style={{position:'absolute', width:300, height:300, borderRadius:9999, border:'6px solid rgba(250,204,21,0.08)', opacity:0.9}} />
        <div style={{position:'absolute', width:280, height:280, borderRadius:9999, border:'8px solid rgba(250,190,40,0.14)', boxShadow:'0 26px 48px rgba(250,160,40,0.08)'}} />
        <div style={{position:'absolute', width:260, height:260, borderRadius:9999, background:'radial-gradient(circle at 30% 30%, #fffef8, #fff2e0)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 28px 60px rgba(249,115,22,0.08)'}}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:16, color:'#f59e0b', fontWeight:800, letterSpacing:2}}>{label.toUpperCase()}</div>
            <div style={{fontSize:36, color:'#dd6b20', fontWeight:900, marginTop:8, letterSpacing:1}}>{time}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Reflections({ text }){
  return (
    <div style={{marginTop:22, background:'#fffaf6', padding:14, borderRadius:12, boxShadow:'0 10px 20px rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.06)'}}>
      <div style={{fontSize:12, color:'#f59e0b', fontWeight:800, letterSpacing:1}}>REFLECTIONS</div>
      <div style={{marginTop:8, color:'#5b5b5b', lineHeight:1.5}}>{text}</div>
    </div>
  )
}

function WeeklyGrid(){
  const days = ['S','M','T','W','T','F','S']
  const prayers = ['FAJR','DHUHR','ASR','MAGHRIB','ISHA']
  return (
    <div style={{marginTop:18, background:'#fffaf6', padding:12, borderRadius:12, border:'1px solid rgba(245,158,11,0.06)'}}>
      <div style={{display:'flex', justifyContent:'center', fontWeight:800, color:'#f59e0b', marginBottom:12}}>WEEKLY</div>
      <div style={{display:'grid', gridTemplateColumns:'80px 1fr', gap:8, alignItems:'center'}}>
        <div style={{fontSize:12, color:'#9ca3af'}}></div>
        <div style={{display:'flex', justifyContent:'space-between', paddingRight:16}}>
          {days.map((d, i) => <div key={`${d}-${i}`} style={{fontSize:12, color:'#9ca3af'}}>{d}</div>)}
        </div>
        {prayers.map(p => (
          <React.Fragment key={p}>
            <div style={{fontSize:13, color:'#5b5b5b', fontWeight:600}}>{p}</div>
            <div style={{display:'flex', justifyContent:'space-between', paddingRight:16}}>
              {days.map((d, i) => (
                <div key={`${p}-${d}-${i}`} style={{width:12, height:12, borderRadius:12, background:'#f59e0b', opacity:0.95}} />
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export default function MainScreenDesign(){
  const [countdown, setCountdown] = useState('00:00:00')
  const [nextPrayerLabel, setNextPrayerLabel] = useState('FAJR')

  // compute next prayer and keep countdown; recompute when the countdown reaches zero
  useEffect(()=>{
    const raw = typeof window !== 'undefined' ? localStorage.getItem('mood_settings') : null
    const settings = raw ? JSON.parse(raw) : null
    const safeSettings = Object.assign({ lat:21.4225, lon:39.8262, method:'Makkah', asr:'Shafi' }, settings || {})

    function computeNextPrayer(){
      try{
        const times = computePrayerTimesForDate(new Date(), safeSettings) || estimatePrayerTimesForDate(new Date())
        const order = ['Fajr','Dhuhr','Asr','Maghrib','Isha']
        const now = new Date()
        let nextDate = null
        let nextLabel = 'Fajr'
        for(const p of order){
          const t = times[p]
          if(!t) continue
          const parts = t.split(':')
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(parts[0]), Number(parts[1]) || 0, 0)
          if(d.getTime() > now.getTime()){ nextDate = d; nextLabel = p; break }
        }
        if(!nextDate){
          const t = times['Fajr'] || '05:00'
          const parts = t.split(':')
          nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, Number(parts[0]), Number(parts[1]) || 0, 0)
          nextLabel = 'Fajr'
        }
        return { nextDate, nextLabel }
      }catch{ return null }
    }

    let state = computeNextPrayer()
    if(!state) return
    setNextPrayerLabel(state.nextLabel)

    // update function uses a stable state var and ensures immediate recompute when expired
  let _lastComputeTs = Date.now()
    function updateCountdown(){
      if(!state || !state.nextDate) return
      const now = new Date()
      const diff = Math.max(0, Math.floor((state.nextDate.getTime() - now.getTime())/1000))
      const hh = String(Math.floor(diff/3600)).padStart(2,'0')
      const mm = String(Math.floor((diff%3600)/60)).padStart(2,'0')
      const ss = String(diff%60).padStart(2,'0')
      setCountdown(`${hh}:${mm}:${ss}`)
      // If expired or near expired, recompute immediately and update label/state
      if(diff <= 0){
        const newState = computeNextPrayer()
        if(newState && newState.nextDate && newState.nextDate.getTime() !== (state.nextDate && state.nextDate.getTime())){
          state = newState
          setNextPrayerLabel(state.nextLabel)
          _lastComputeTs = Date.now()
        }
      }
    }

    updateCountdown()
    const id = setInterval(updateCountdown, 1000)

    // also recompute when tab becomes visible to avoid stale timers when backgrounded
    function handleVisibility(){ if(document.visibilityState === 'visible') updateCountdown() }
    if(typeof document !== 'undefined') document.addEventListener('visibilitychange', handleVisibility)

    return ()=>{ clearInterval(id); if(typeof document !== 'undefined') document.removeEventListener('visibilitychange', handleVisibility) }
  }, [])

  // format header: Gregorian month, simplified Islamic month, and Hijri year to match the reference image
  const now = new Date()
  const gregMonth = now.toLocaleString(undefined, { month: 'long' }).toUpperCase()
  // use Intl with the islamic calendar to get the month and year
  const islamicMonthRaw = (new Intl.DateTimeFormat('en-u-ca-islamic', { month: 'long' })).format(now)
  // simplify to the most distinctive token (e.g. "Dhu al-Qi'dah" -> "QIDAH")
  const islamicMonthToken = (islamicMonthRaw.split(/\s+/).pop() || islamicMonthRaw).replace(/[^A-Za-z]/g, '').toUpperCase()
  const hijriYear = (new Intl.DateTimeFormat('en-u-ca-islamic', { year: 'numeric' })).format(now)

  return (
    <div style={{width:'100%', maxWidth:420, margin:'0 auto', padding:'22px 18px', borderRadius:22, background:'linear-gradient(180deg,#fffaf0,#fff6ea)', display:'flex', flexDirection:'column', alignItems:'stretch', minHeight:'100vh', position:'relative', overflow:'hidden', boxSizing:'border-box'}}>
      {/* soft layered background shapes */}
      <div aria-hidden style={{position:'absolute', inset:0, pointerEvents:'none', zIndex:0}}>
        <div style={{position:'absolute', left:-120, top:40, width:360, height:360, borderRadius:9999, background:'radial-gradient(circle at 30% 30%, rgba(255,244,214,0.9), rgba(255,244,214,0.35))'}} />
        <div style={{position:'absolute', right:-80, top:-40, width:420, height:420, borderRadius:9999, background:'radial-gradient(circle at 70% 20%, rgba(255,249,230,0.8), rgba(255,249,230,0.18))'}} />
        <div style={{position:'absolute', left:10, bottom:-120, width:520, height:520, borderRadius:9999, background:'radial-gradient(circle at 20% 80%, rgba(255,244,200,0.78), rgba(255,244,200,0.16))'}} />
        <svg style={{position:'absolute', left:0, right:0, top:0, bottom:0, width:'100%', height:'100%'}} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="g1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff9f0" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#fff9f0" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#g1)" />
        </svg>
      </div>
      {/* Main content — ensure it appears above background decorations */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'center', padding:'6px 4px', position:'relative', zIndex:2}}>
        <div style={{textAlign:'center'}}>
          {/* Gregorian month pill */}
          <div className="trial-pill" style={{display:'inline-block', background:'#fff3e0', padding:'4px 10px', borderRadius:9999, fontSize:11, color:'#f97316', fontWeight:900, letterSpacing:3, textTransform:'uppercase'}}>{gregMonth}</div>

          {/* Islamic month prominent */}
          <div className="trial-display" style={{fontSize:76, fontWeight:900, color:'#f97316', lineHeight:0.88, marginTop:8, letterSpacing:8, textShadow:'0 8px 28px rgba(249,115,22,0.08)'}}>{islamicMonthToken}</div>

          {/* Hijri year */}
          <div className="trial-year" style={{fontSize:13, color:'#f59e0b', fontWeight:800, marginTop:6, opacity:0.95, letterSpacing:2}}>{hijriYear}</div>
        </div>
      </div>

      <div style={{display:'flex', alignItems:'center', justifyContent:'center', marginTop:6, zIndex:2, position:'relative'}}>
        <Circle label={nextPrayerLabel} time={countdown} />
      </div>

      <div style={{opacity:0.95, marginTop:14, zIndex:2, position:'relative'}}>
        <Reflections text={'“Be mindful and show gratitude; small moments matter.”'} />
      </div>

      <div style={{marginTop:14, zIndex:2, position:'relative'}}>
        <WeeklyGrid />
      </div>
    </div>
  )
}
