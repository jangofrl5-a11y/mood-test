import React, { useEffect, useState, useRef, useCallback } from 'react'
import { formatDate } from '../utils/dateHelpers'
import { computePrayerTimesForDate } from '../utils/prayerUtils'
import PrayerTimeline from './PrayerTimeline'

export default function PrayerScreen({ onDone }){
  const [_now, setNow] = useState(new Date())
  const [prayers, setPrayers] = useState([])
  const [index, setIndex] = useState(0)
  const [accepting, setAccepting] = useState(false)
  const timerRef = useRef(null)

  // load today's computed times (uses settings from localStorage)
  useEffect(()=>{
    try{
      const today = new Date()
      const raw = localStorage.getItem('mood_settings')
      const settings = raw ? JSON.parse(raw) : {}
      const times = computePrayerTimesForDate(today, settings)
      const list = ['Fajr','Dhuhr','Asr','Maghrib','Isha'].map((label)=>({ label, time: times[label] }))
      setPrayers(list)
      // set index to next upcoming
      const nowt = new Date()
      const nextIdx = list.findIndex(p=>{
        const [hh,mm] = (p.time||'00:00').split(':').map(Number)
        const d = new Date(nowt); d.setHours(hh||0, mm||0,0,0)
        return d.getTime() > Date.now()
      })
      setIndex(nextIdx === -1 ? 0 : nextIdx)
  }catch(_e){ console.error('failed to compute prayers', _e); void _e }
  },[])

  useEffect(()=>{
    const id = setInterval(()=> setNow(new Date()), 1000)
    return ()=> clearInterval(id)
  },[])

  // schedule pre-prayer reminders (10 minutes before) and clean up on unmount
  useEffect(()=>{
    const reminders = []
    try{
      prayers.forEach(p => {
        if(!p || !p.time) return
        const [hh,mm] = p.time.split(':').map(Number)
        const d = new Date(); d.setHours(hh||0, mm||0,0,0)
        const when = d.getTime() - (10 * 60 * 1000) // 10 minutes before
        const nowMs = Date.now()
        if(when > nowMs){
          const id = setTimeout(()=>{
            notify('Upcoming prayer', `${p.label} in 10 minutes — plan to prepare. Try finishing tasks and making wudu.`)
            // optional local toast (if available in calendarview we used setLocalToast; here we fallback to Notification)
          }, when - nowMs)
          reminders.push(id)
        }
      })
    }catch(e){ void e; /* ignore */ }
    return ()=> reminders.forEach(id=> clearTimeout(id))
  }, [prayers, notify])

  // Notification helper
  const notify = useCallback(async (title, body) =>{
    try{
      if(typeof Notification !== 'undefined' && Notification.permission === 'granted'){
        new Notification(title, { body })
      } else if(typeof Notification !== 'undefined' && Notification.permission !== 'denied'){
        const p = await Notification.requestPermission()
        if(p === 'granted') new Notification(title, { body })
      }
    }catch(_e){ console.warn('notify failed', _e); void _e }
  }, [])

  // Accept logic: user has X seconds to accept prayer (default 90s)
  const startAcceptWindow = useCallback((timeoutSec = 90)=>{
    setAccepting(true)
    notify('Prayer due', `It's time for ${prayers[index].label}. Please accept when done.`)
    // start a timer that auto-closes the window (mark missed) after timeout
    timerRef.current = setTimeout(()=>{
      setAccepting(false)
      timerRef.current = null
      // track missed: we simply leave it uncounted
    }, timeoutSec*1000)
  }, [index, notify, prayers])

  function acceptPrayer(){
    try{
      // increment today's accepted count
      const key = 'accepted_prayers_' + formatDate(new Date())
      const before = Number(localStorage.getItem(key) || '0')
      localStorage.setItem(key, String(before+1))
      // record a timestamp for this specific prayer
      try{
        const tsKey = 'accepted_prayer_times_' + formatDate(new Date())
        const raw = localStorage.getItem(tsKey)
        const obj = raw ? JSON.parse(raw) : {}
        obj[prayers[index].label] = new Date().toISOString()
        localStorage.setItem(tsKey, JSON.stringify(obj))
      }catch(_e){ void _e }
      // clear accept window
      if(timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      setAccepting(false)
      notify('Well done', `Recorded ${prayers[index].label}. Keep it up!`)
  }catch(_e){ console.error('acceptPrayer failed', _e); void _e }
  }

  function prev(){ setIndex(i=> Math.max(0, i-1)) }
  function next(){ setIndex(i=> Math.min(prayers.length-1, i+1)) }

  // whenever index changes, if the new prayer is due (time <= now), auto-open accept window
  useEffect(()=>{
    if(!prayers || prayers.length === 0) return
    const p = prayers[index]
    if(!p || !p.time) return
    const [hh,mm] = p.time.split(':').map(Number)
    const d = new Date(); d.setHours(hh||0, mm||0,0,0)
    if(d.getTime() <= Date.now()){
      // open accept window automatically
      startAcceptWindow(90)
    }
  }, [index, prayers, startAcceptWindow])

  const acceptedCount = Number(localStorage.getItem('accepted_prayers_' + formatDate(new Date())) || '0')

  return (
    <div style={{maxWidth:920, margin:'24px auto', padding:20, borderRadius:14, background:'linear-gradient(180deg,#ffffff,#f7fff7)'}}>
      <div style={{display:'flex', gap:18, alignItems:'center'}}>
        <div style={{width:140, height:140, borderRadius:14, background:'linear-gradient(180deg,#e6fff2,#f1fff6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:84}}>🕋</div>
        <div style={{flex:1}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <div style={{fontSize:18, fontWeight:800}}>{prayers[index] ? prayers[index].label : ''}</div>
              <div style={{fontSize:14, color:'#065f67'}}>{prayers[index] ? prayers[index].time : ''}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:800, fontSize:20}}>{acceptedCount} / 5</div>
              <div style={{fontSize:12, color:'#065f67'}}>prayers done today</div>
            </div>
          </div>
          <div style={{marginTop:12, display:'flex', gap:8}}>
            <button className="creative-btn" onClick={prev} disabled={index===0}>Previous</button>
            <button className="creative-btn" onClick={next} disabled={index===prayers.length-1}>Next</button>
            <div style={{flex:1}} />
            <button className="creative-btn" onClick={()=> startAcceptWindow(90)}>Notify me</button>
          </div>
        </div>
      </div>

      <div style={{marginTop:18}}>
        {accepting && (
          <div style={{padding:12, borderRadius:10, background:'#ecfdf5', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <div style={{fontWeight:700}}>{prayers[index].label} — {prayers[index].time}</div>
              <div style={{fontSize:13, color:'#065f67'}}>You have limited time to confirm this prayer as completed.</div>
            </div>
            <div style={{display:'flex', gap:8}}>
              <button className="creative-btn" onClick={acceptPrayer}>Mark done</button>
              <button className="btn-secondary" onClick={()=>{ if(timerRef.current){ clearTimeout(timerRef.current); timerRef.current = null } setAccepting(false) }}>Dismiss</button>
            </div>
          </div>
        )}
      </div>
      <div style={{marginTop:14, display:'flex', justifyContent:'flex-end', gap:8}}>
        <button className="creative-btn" onClick={()=>{
          // commit today's accepted count into prayer_history
          const key = 'accepted_prayers_' + formatDate(new Date())
          const val = Number(localStorage.getItem(key) || '0')
          const histRaw = localStorage.getItem('prayer_history')
          const hist = histRaw ? JSON.parse(histRaw) : {}
            hist[formatDate(new Date())] = val
            // also persist per-prayer timestamps if present
            try{
              const tsKey = 'accepted_prayer_times_' + formatDate(new Date())
              const tsRaw = localStorage.getItem(tsKey)
              if(tsRaw){
                const per = JSON.parse(tsRaw)
                const phKey = 'prayer_history_detailed' // optional separate store
                const phRaw = localStorage.getItem(phKey)
                const ph = phRaw ? JSON.parse(phRaw) : {}
                ph[formatDate(new Date())] = per
                localStorage.setItem(phKey, JSON.stringify(ph))
              }
            }catch(_e){ void _e }
          localStorage.setItem('prayer_history', JSON.stringify(hist))
          notify('Saved', `Saved today's count: ${val}`)
        }}>Commit</button>
        <button className="btn-secondary" onClick={()=>{ if(onDone) onDone() }}>Close</button>
      </div>
      {/* timeline below */}
      <PrayerTimeline prayers={prayers} />
    </div>
  )
}
