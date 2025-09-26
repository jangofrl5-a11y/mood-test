import React from 'react'

const backdropStyle = {
  position: 'fixed', inset: 0, background: 'linear-gradient(180deg, rgba(12,10,7,0.32), rgba(12,10,7,0.42))', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
}
const panelStyle = { width: '96%', maxWidth: 1100, borderRadius: 18, overflow: 'hidden', boxShadow: '0 26px 80px rgba(17,75,43,0.18)' }

import AiAdvisor from './AiAdvisor'

export default function DailyModal({children, open, onClose, loadingPrompt}){
  if(!open) return null
  return (
    <div style={backdropStyle} role="dialog" aria-modal="true">
      <div style={panelStyle}>
        <div style={{background:'#f7efe1', padding:8, textAlign:'right', color:'#114B2B'}}>
          <button onClick={onClose} style={{border:'none', background:'transparent', fontSize:18, color:'#114B2B'}}>✕</button>
        </div>
        <div style={{background:'#fffaf6', padding:18, color:'#114B2B'}}>
          {/* show AI advice prominently on the loading modal if a prompt is provided */}
          {loadingPrompt ? (
            <div style={{marginBottom:16}}>
              <AiAdvisor prompt={loadingPrompt} autoAsk={true} hideInput={true} />
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  )
}
