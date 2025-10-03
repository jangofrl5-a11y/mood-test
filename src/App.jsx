import React, { useEffect, useState } from 'react'
import Mood from './pages/mood';
import DailyModal from './components/DailyModal';
import Toast from './components/Toast';
import CalendarView from './components/calendarview';
import PrayerSlider from './components/PrayerSlider';
import PrayerScreen from './components/PrayerScreen';

function todayKey(){
  const d = new Date();
  return `mood_shown_${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
}

function App() {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [hasSaved, setHasSaved] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [animateCalendar, setAnimateCalendar] = useState(false)
  const [isAnimatingSave, setIsAnimatingSave] = useState(false)
  const [showPrayerScreen, setShowPrayerScreen] = useState(false)

  useEffect(()=>{
    const key = todayKey()
    if(!localStorage.getItem(key)){
      setOpen(true)
    }
  },[])

  // prepare a loading prompt from the most recent saved entry (if any)
  const loadingPrompt = (()=>{
    try{
      const raw = localStorage.getItem('mood_entries')
      const arr = raw ? JSON.parse(raw) : []
      if(arr && arr.length) return arr[0].text || arr[0].mood || 'Take a moment to reflect and seek guidance.'
    }catch(e){}
    return 'Take a moment to reflect and remember His mercy. How might I respond kindly to my feelings today?'
  })()

  function handleClose(){
    localStorage.setItem(todayKey(), '1')
    setOpen(false)
  }

  function handleSave(entry){
    setToast('Saved — JazakAllah khair')
    setHasSaved(true)
    // animate from top-left calendar icon to center then show calendar
    // Call animateIconToCenter first so it can find the calendar button in the DOM,
    // then hide the journal content while the flying icon animates.
    animateIconToCenter(() => {
      setAnimateCalendar(true)
      setShowCalendar(true)
      setIsAnimatingSave(false)
      // show prayer screen after the save animation completes
      setShowPrayerScreen(true)
    })
    // hide the journal content but keep background while animation runs
    setIsAnimatingSave(true)
  }

  function openCalendarFromHeader(){
    if(!hasSaved) {
      // politely nudge the user to save first
      setToast('Save an entry first to view the calendar')
      return
    }
    animateIconToCenter(()=>{
      setAnimateCalendar(true)
      setShowCalendar(true)
    })
  }

  // animate a clone of the top-left calendar button to the center of the viewport
  function animateIconToCenter(onComplete){
    try{
      const btn = document.querySelector('[data-app-calendar]')
      if(!btn) { onComplete(); return }
      const rect = btn.getBoundingClientRect()
      const clone = btn.cloneNode(true)
      clone.style.position = 'fixed'
      clone.style.left = rect.left + 'px'
      clone.style.top = rect.top + 'px'
      clone.style.width = rect.width + 'px'
      clone.style.height = rect.height + 'px'
      clone.style.zIndex = 99999
      clone.style.transition = 'transform 560ms cubic-bezier(.22,.9,.3,1), opacity 420ms'
      clone.classList.add('flying-icon')
      document.body.appendChild(clone)
      // compute center
      const cx = window.innerWidth/2 - rect.width/2
      const cy = window.innerHeight/2 - rect.height/2
      requestAnimationFrame(()=>{
        clone.style.transform = `translate(${cx-rect.left}px, ${cy-rect.top}px) scale(2.4)`
        clone.style.opacity = '0.95'
      })
      setTimeout(()=>{
        clone.style.opacity = '0'
      }, 420)
      setTimeout(()=>{
        document.body.removeChild(clone)
        onComplete && onComplete()
      }, 700)
    }catch(e){
      console.error('animateIconToCenter failed', e)
      onComplete && onComplete()
    }
  }

  // Remind-later: if user set a timestamp 'mood_remind_at' in localStorage, check it
  useEffect(()=>{
    const ts = localStorage.getItem('mood_remind_at')
    if(!ts) return
    const when = Number(ts)
    if(isNaN(when)) return
    const now = Date.now()
    if(when <= now){
      // show modal and clear key
      setOpen(true)
      localStorage.removeItem('mood_remind_at')
    } else {
      const t = setTimeout(()=>{
        setOpen(true)
        localStorage.removeItem('mood_remind_at')
      }, when - now)
      return ()=>clearTimeout(t)
    }
  },[])

  return (
    <div className="main-bounce app-root">
      <DailyModal open={open} onClose={handleClose} loadingPrompt={loadingPrompt}>
        <Mood />
      </DailyModal>
      {!open && !showCalendar && (
        isAnimatingSave ? (
          // render a friendly loading card while the flying icon animation runs
          <div className="save-loading-card" style={{maxWidth:920, margin:'28px auto', padding:36, borderRadius:22}}>
            <div style={{display:'flex', alignItems:'center', gap:18}}>
              <div className="save-spinner" aria-hidden>
                <div className="save-spinner-inner">🕋</div>
              </div>
              <div>
                <div style={{fontWeight:800, fontSize:18}}>Preparing your calendar…</div>
                <div style={{marginTop:6, color:'#065f67'}}>{loadingPrompt}</div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {!showPrayerScreen && <PrayerSlider onOpenCalendar={openCalendarFromHeader} />}
            {!showPrayerScreen && <Mood onSave={handleSave} onOpenCalendar={openCalendarFromHeader} hasSaved={hasSaved} />}
            {showPrayerScreen && <PrayerScreen onDone={()=> setShowPrayerScreen(false)} />}
          </div>
        )
      )}
      {showCalendar && <CalendarView animate={animateCalendar} />}
      {toast && <Toast message={toast} onClose={()=>setToast(null)} />}
      {/* DEV debug: floating opener to force the calendar for debugging */}
      {process.env.NODE_ENV !== 'production' && (
        <button
          aria-label="Open Calendar (debug)"
          onClick={()=>{ setShowCalendar(true); setAnimateCalendar(true); setHasSaved(true) }}
          style={{position:'fixed', right:16, bottom:16, zIndex:99999, padding:'10px 12px', borderRadius:10, background:'#065f67', color:'#fff', border:'none', boxShadow:'0 8px 24px rgba(6,95,103,0.18)'}}
          data-dev-open-calendar
        >Open Calendar</button>
      )}
    </div>
  )
}

export default App;