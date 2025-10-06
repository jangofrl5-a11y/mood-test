import React, { useEffect, useState, useRef } from 'react'
import Mood from './pages/mood'
import DailyModal from './components/DailyModal'
import MainScreenDesign from './components/MainScreenDesign'

function todayKey(){
  const d = new Date();
  return `mood_shown_${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
}

function ScaleWrapper({ children, internalWidth = 980, minScale = 0.5, maxScale = 2 }){
  const ref = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(()=>{
    let ro = null
    function updateContainer(){
      try{
        const el = ref.current && ref.current.parentElement
        const available = el ? el.clientWidth : window.innerWidth
        // Allow the inner content to scale up to fill the available width (so the
        // app can occupy the full iPhone frame). Clamp to a sensible range to
        // avoid extreme zooming on very large viewports.
  let s = available / internalWidth
  if(!isFinite(s) || s <= 0) s = 1
  // Clamp to the provided min/max scale props.
  s = Math.max(minScale, Math.min(s, maxScale))
        setScale(Number(s.toFixed(3)))
      }catch{ /* ignore */ }
    }
    updateContainer()
    try{
      if(typeof ResizeObserver !== 'undefined'){
        ro = new ResizeObserver(()=> updateContainer())
        if(ref.current && ref.current.parentElement) ro.observe(ref.current.parentElement)
      } else {
        window.addEventListener('resize', updateContainer)
      }
  }catch{ window.addEventListener('resize', updateContainer) }
  return ()=>{ try{ ro && ro.disconnect() }catch{ /* ignore */ } ; window.removeEventListener('resize', updateContainer) }
  }, [internalWidth, minScale, maxScale])

  return (
    <div style={{width: '100%', height: '100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>
      <div ref={ref} style={{transform: `scale(${scale})`, transformOrigin: 'top center', width: internalWidth, minHeight: '100vh'}}>
        {children}
      </div>
    </div>
  )
}

function App({ deviceWidth, minScale = 0.5, maxScale = 1.15 }) {
  // Open modal by default on first visit for the day. Persisted by `todayKey()` in localStorage.
  const [open, setOpen] = useState(() => {
    try{
      if(typeof window === 'undefined') return true
      return !localStorage.getItem(todayKey())
    }catch{ return true }
  })
    const [_toast, setToast] = useState(null)
    const [hasSaved, setHasSaved] = useState(false)
    const [_showCalendar, setShowCalendar] = useState(false)
    const [_animateCalendar, setAnimateCalendar] = useState(false)
    const [_isAnimatingSave, setIsAnimatingSave] = useState(false)
    const [_showPrayerScreen, setShowPrayerScreen] = useState(false)

  // Determine initial effective min/max scales from URL params or props.
  const [effectiveMinScale, setEffectiveMinScale] = useState(()=>{
    if(typeof window === 'undefined') return minScale
    try{ const p = new URLSearchParams(window.location.search); const v = Number(p.get('minScale')); return (isFinite(v) && v > 0) ? v : minScale }catch{ return minScale }
  })
  const [effectiveMaxScale, setEffectiveMaxScale] = useState(()=>{
    if(typeof window === 'undefined') return maxScale
    try{ const p = new URLSearchParams(window.location.search); const v = Number(p.get('maxScale')); return (isFinite(v) && v > 0) ? v : maxScale }catch{ return maxScale }
  })

  // Expose a live helper to update scales without reloading when in a dev session.
  if(typeof window !== 'undefined'){
    try{
      window.__APP_SCALE = {
        minScale: effectiveMinScale,
        maxScale: effectiveMaxScale,
        set(min, max){ if(min != null) setEffectiveMinScale(Number(min)); if(max != null) setEffectiveMaxScale(Number(max)) }
      }
    }catch{ /* ignore */ }
  }

  // Note: modal open is controlled explicitly. We don't auto-open on first run to keep
  // initial debug state stable (open:false, showCalendar:false, showPrayerScreen:false, isAnimatingSave:false)

  // prepare a loading prompt from the most recent saved entry (if any)
  const loadingPrompt = (()=>{
    try{
      const raw = localStorage.getItem('mood_entries')
      const arr = raw ? JSON.parse(raw) : []
      if(arr && arr.length) return arr[0].text || arr[0].mood || 'Take a moment to reflect and seek guidance.'
  }catch{ /* ignore */ }
    return 'Take a moment to reflect and remember His mercy. How might I respond kindly to my feelings today?'
  })()

  function handleClose(){
    localStorage.setItem(todayKey(), '1')
    setOpen(false)
  }

  function handleSave(){
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
  <>
    <ScaleWrapper internalWidth={deviceWidth || 375} minScale={effectiveMinScale} maxScale={effectiveMaxScale}>
      <div className="main-bounce app-root">
        {/* Always render the main design. The DailyModal will overlay it when `open` is true. */}
        <MainScreenDesign />
        <DailyModal open={open} onClose={handleClose} loadingPrompt={loadingPrompt}>
          <Mood onSave={()=>{ handleSave(); handleClose(); }} onOpenCalendar={openCalendarFromHeader} />
        </DailyModal>
      </div>
    </ScaleWrapper>

    {/* Dev control: visible when showDev param present or when NODE_ENV is not production */}
    {(() => {
      const isDev = (typeof window !== 'undefined') && (window.location.search.indexOf('showDev') !== -1 || process.env.NODE_ENV !== 'production')
      if(!isDev) return null
      return (
        <div style={{position:'fixed', right:12, bottom:12, background:'rgba(0,0,0,0.6)', color:'#fff', padding:12, borderRadius:8, zIndex:99999, fontSize:12}}>
          <div style={{marginBottom:8}}>Scale bounds</div>
          <label style={{display:'block'}}>min: <input type="number" step="0.01" value={effectiveMinScale} onChange={(e)=>setEffectiveMinScale(Number(e.target.value))} style={{width:72}}/></label>
          <label style={{display:'block'}}>max: <input type="number" step="0.01" value={effectiveMaxScale} onChange={(e)=>setEffectiveMaxScale(Number(e.target.value))} style={{width:72}}/></label>
          <div style={{marginTop:8, display:'flex', gap:8}}>
            <button onClick={()=>{ setEffectiveMinScale(minScale); setEffectiveMaxScale(maxScale) }}>Reset</button>
            <button onClick={()=>{ window.__APP_SCALE && window.__APP_SCALE.set(effectiveMinScale, effectiveMaxScale) }}>Apply</button>
          </div>
        </div>
      )
    })()}
  </>
  )
}

export default App;