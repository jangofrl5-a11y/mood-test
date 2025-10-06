// src/pages/Journal.jsx
import React, { useState } from 'react'
import CalendarView from '../components/calendarview'
import SaveButton from '../components/SaveButton'
import EmailInput from '../components/EmailInput'

// Journal page avoids importing Chakra at module load; it will dynamically load Chakra in render if available.

export default function Journal() {
  // loading state removed (not used currently)
  const [reply, setReply] = useState('')

  // Gemini integration removed; keep a placeholder for future server-side helpers
  function askGemini() {
    setReply('Gemini integration removed from this repository.');
  }
  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <CalendarView />
        <EmailInput />
        <textarea placeholder="Write your thoughts here..." style={{ width: '100%', minHeight: 160 }} />
        <div>
          <button onClick={askGemini} style={{ padding: '8px 12px', borderRadius: 6, background: '#319795', color: 'white' }}>Ask (disabled)</button>
          <div style={{ marginTop: 12, padding: 12, background: '#f7fafc', borderRadius: 8 }}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{reply || 'Server-side LLM support has been removed.'}</div>
          </div>
        </div>
        <SaveButton />
      </div>
    </div>
  );
}