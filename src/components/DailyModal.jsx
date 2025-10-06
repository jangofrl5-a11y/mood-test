import React from 'react'

const backdropStyle = {
  position: 'fixed', inset: 0, background: 'linear-gradient(180deg, rgba(12,10,7,0.32), rgba(12,10,7,0.42))', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2147483646
}
const panelStyle = { width: '96%', maxWidth: 920, borderRadius: 18, overflow: 'hidden', boxShadow: '0 26px 80px rgba(17,75,43,0.18)' }

import AiAdvisor from './AiAdvisor'

export default function DailyModal({children, open}){
  // Minimal daily modal: show mood selection only. Dismissal only via Save (handled by Mood onSave)
  if(!open) return null

  return (
    <div style={backdropStyle} role="dialog" aria-modal="true">
      <div style={panelStyle}>
        <div style={{background:'#f7efe1', padding:12, color:'#114B2B', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div style={{fontWeight:800}}>Daily Check‑in</div>
          <div style={{fontSize:13, color:'#114B2B', opacity:0.9}}>Please select your mood and Save</div>
        </div>
        <div style={{background:'#fffaf6', padding:22, color:'#114B2B', minHeight:180, display:'flex', flexDirection:'column'}}>
          <div style={{flex:1}}>
            {/* Render the provided child (Mood) which should handle save and call onSave */}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
