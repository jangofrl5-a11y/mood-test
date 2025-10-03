import React, { useEffect, useState, useRef } from 'react'
import { ensureDate, formatDate } from '../utils/dateHelpers'
import { computePrayerTimesForDate } from '../utils/prayerUtils'

function fmtTimeStr(t){ if(!t) return ''; return t }

export default function PrayerScreen({ onDone }){
  const [now, setNow] = useState(new Date())
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
    }catch(e){ console.error(e) }
  },[])

  useEffect(()=>{
    const id = setInterval(()=> setNow(new Date()), 1000)
    return ()=> clearInterval(id)
  },[])

  // Notification helper
  const notify = async (title, body) =>{
    try{
      if(typeof Notification !== 'undefined' && Notification.permission === 'granted'){
        new Notification(title, { body })
      } else if(typeof Notification !== 'undefined' && Notification.permission !== 'denied'){
        const p = await Notification.requestPermission()
        if(p === 'granted') new Notification(title, { body })
      }
    }catch(e){ console.warn('notify failed', e) }
  }

  // Accept logic: user has X seconds to accept prayer (default 90s)
  function startAcceptWindow(timeoutSec = 90){
    setAccepting(true)
    notify('Prayer due', `It's time for ${prayers[index].label}. Please accept when done.`)
    // start a timer that auto-closes the window (mark missed) after timeout
    timerRef.current = setTimeout(()=>{
      setAccepting(false)
      timerRef.current = null
      // track missed: we simply leave it uncounted
    }, timeoutSec*1000)
  }

  function acceptPrayer(){
    try{
      // increment today's accepted count
      const key = 'accepted_prayers_' + formatDate(new Date())
      const before = Number(localStorage.getItem(key) || '0')
      localStorage.setItem(key, String(before+1))
      // clear accept window
      if(timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      setAccepting(false)
      notify('Well done', `Recorded ${prayers[index].label}. Keep it up!`)
    }catch(e){ console.error(e) }
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
  }, [index, prayers])

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
    </div>
  )
}
