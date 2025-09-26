import React from 'react'
import { FaCalendarAlt, FaLeaf } from 'react-icons/fa'
import AiAdvisor from '../components/AiAdvisor'

const containerStyle = {
  maxWidth: 920,
  margin: '28px auto',
  padding: 32,
  background: 'linear-gradient(135deg,#e6f9ee,#eefef6)',
  borderRadius: 22,
  boxShadow: '0 18px 40px rgba(2,6,23,0.06)',
  fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial"
}

const cardStyle = {
  background: 'linear-gradient(180deg,#f0fff6,#e6fff0)',
  padding: 22,
  borderRadius: 14,
  boxShadow: '0 8px 26px rgba(2,6,23,0.05)',
  border: '1px solid rgba(17,75,43,0.04)'
}

const moodButton = {
  padding: '12px 18px',
  borderRadius: 12,
  background: 'transparent',
  border: '1px solid rgba(0,0,0,0.06)',
  fontSize: 16,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  transition: 'transform 220ms cubic-bezier(.2,.9,.2,1), box-shadow 220ms, background 220ms, color 220ms',
  color: '#0f172a'
}

const moodSelected = {
  transform: 'translateY(-4px)',
  boxShadow: '0 8px 24px rgba(17,75,43,0.12)',
  background: 'linear-gradient(90deg,#e6f7ef,#dff6ea)',
  color: '#114B2B',
  border: '1px solid rgba(17,75,43,0.14)'
}

// hover/focus interaction styles (applied inline where possible)
const moodHover = {
  // playful lift: small upward translate and gentle scale
  transform: 'translateY(-6px) scale(1.02)',
  boxShadow: '0 14px 36px rgba(3,106,115,0.14)'
}

const focusStyle = {
  outline: '3px solid rgba(3,106,115,0.12)',
  outlineOffset: 4
}

  const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: 10,
  background: 'linear-gradient(180deg,#e6fff0,#ccffdf)',
  boxShadow: '0 6px 16px rgba(2,6,23,0.04)',
  fontSize: 16
}

export default function Mood({onSave, onOpenCalendar, hasSaved}){
  const [mood, setMood] = React.useState('Grateful')
  const [text, setText] = React.useState('')
  const [dua, setDua] = React.useState('Ayah: 94:6')
  const journalRef = React.useRef(null)

  function save(){
    const entry = { id: Date.now(), mood, text, dua, createdAt: new Date().toISOString() }
    try{
      const raw = localStorage.getItem('mood_entries')
      const arr = raw ? JSON.parse(raw) : []
      arr.unshift(entry)
      localStorage.setItem('mood_entries', JSON.stringify(arr))
    }catch(e){
      console.error('save error', e)
    }
    if(onSave) onSave(entry)
  }

  return (
    <div style={containerStyle} className="enter-animate">
      <div style={{marginBottom:18, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <div style={{fontSize:28, fontWeight:800, letterSpacing: '-0.02em', color:'#114B2B'}}>🌙 Islamic Mood Journal</div>
          <div style={{color:'#3f6b58', marginTop:6, fontStyle:'italic'}}>“Indeed, with hardship comes ease.” (94:6)</div>
        </div>
        <div style={{display:'flex', gap:10}}>
          <button data-app-calendar aria-label="calendar" onClick={() => onOpenCalendar && onOpenCalendar()} style={{...moodButton, padding:10, borderRadius:10}}><FaCalendarAlt/></button>
          <button aria-label="nature" style={{...moodButton, padding:10, borderRadius:10}}><FaLeaf/></button>
        </div>
      </div>

      <div style={cardStyle}>
  <div style={{fontWeight:800, marginBottom:14, fontSize:18, color:'#114B2B'}}>How are you feeling today?</div>
        <div style={{display:'flex', gap:14, marginBottom:20}}>
          {['Peaceful','Sad','Frustrated','Grateful'].map((m, idx)=> {
            const is = m === mood
            const emoji = m==='Peaceful'?'🌿':m==='Sad'?'😢':m==='Frustrated'?'😠':'😊'
            return (
              <button
                key={m}
                onClick={()=>setMood(m)}
                aria-pressed={is}
                onFocus={e => { e.currentTarget.style.outline = focusStyle.outline; e.currentTarget.style.outlineOffset = focusStyle.outlineOffset }}
                onBlur={e => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
                style={{
                  ...moodButton,
                  ...(is? moodSelected : {}),
                  // add an explicit animationDelay for stagger (CSS animation)
                  animationDelay: `${idx * 90}ms`,
                  padding: '12px 16px',
                  minWidth:120,
                  justifyContent:'flex-start'
                }}
                className="stagger-pop playful-hover"
              >
                <span style={{...badgeStyle, marginRight:8}}>{emoji}</span>
                <div style={{display:'flex', flexDirection:'column', alignItems:'flex-start'}}>
                  <div style={{fontWeight:700, fontSize:15, color: is ? '#114B2B' : '#114B2B'}}>{m}</div>
                  <div style={{fontSize:12, color:is? '#065f67' : '#3f6b58'}}>Select to reflect</div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="spiritual-prompt-wrap" style={{marginBottom:18}}>
          <div style={{background:'linear-gradient(90deg,#fdfef6,#f6fff6)', padding:14, borderRadius:10, border:'1px solid rgba(17,75,43,0.06)'}} className="spiritual-prompt prompt-animate">
            <div style={{fontWeight:800, color:'#114B2B'}}>✨ Spiritual Prompt</div>
            <div style={{color:'#3f6b58'}}>Take a quiet moment to breathe and remember His mercy.</div>
          </div>
        </div>

        <label htmlFor="journalEntry" style={{fontWeight:800, marginBottom:8, color:'#114B2B'}}>
          📝 Journal Entry
        </label>
        <textarea
          id="journalEntry"
          name="journalEntry"
          ref={journalRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Write your thoughts here..."
          style={{
            width: '100%',
            minHeight: 160,
            padding: 14,
            borderRadius: 12,
            border: '1px solid rgba(2,6,23,0.05)',
            boxShadow: 'inset 0 2px 6px rgba(2,6,23,0.02)'
          }}
        />

        <AiAdvisor prompt={text} />

        <label htmlFor="duaSelection" style={{fontWeight:700, marginTop:12, marginBottom:8, color:'#114B2B'}}>
          📿 Add a Dua or Ayah (optional)
        </label>
        <div style={{display:'flex', gap:12, marginBottom:20}}>
          <select
            id="duaSelection"
            name="duaSelection"
            value={dua}
            onChange={e => setDua(e.target.value)}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              border: '1px solid rgba(2,6,23,0.05)'
            }}
          >
            <option>Ayah: 94:6</option>
            <option>Dua: Seeking Forgiveness</option>
          </select>
          <button
            style={{...moodButton, padding:'10px 14px', borderRadius:10, background:'#f8fafc'}}
            onClick={() => {
              try{
                const insert = dua || ''
                setText(prev => {
                  const sep = prev && prev.trim() ? '\n\n' : ''
                  return prev + sep + insert
                })
                // focus the textarea after inserting
                setTimeout(() => {
                  if(journalRef.current) {
                    journalRef.current.focus()
                    // move cursor to end
                    const len = journalRef.current.value.length
                    journalRef.current.setSelectionRange(len, len)
                  }
                }, 20)
              }catch(e){ console.error('attach dua failed', e) }
            }}
          >Attach</button>
        </div>

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{color:'#9ca3af'}}>Saved locally · Private</div>
          <div style={{display:'flex', gap:12}}>
            <button onClick={() => { save(); if(onSave) onSave(); }} style={{padding:'10px 18px', borderRadius:12, background:'linear-gradient(90deg,#06b6d4,#0891b2)', color:'#114B2B', border:'none', boxShadow:'0 8px 18px rgba(3,106,115,0.12)'}}>Save Entry</button>
            <button onClick={()=>{
              const when = Date.now() + 10*60*1000; // 10 minutes
              localStorage.setItem('mood_remind_at', String(when))
              alert('We will remind you in 10 minutes')
            }} style={{padding:'10px 12px', borderRadius:12, background:'linear-gradient(90deg,#f59e0b,#fb923c)', color:'#114B2B', border:'none'}}>Remind me later</button>
          </div>
        </div>
      </div>
    </div>
  )
}
