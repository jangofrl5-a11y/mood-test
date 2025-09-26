import React from 'react'

export default function Toast({message, onClose}){
  React.useEffect(()=>{
    const t = setTimeout(()=>onClose && onClose(), 3500)
    return ()=>clearTimeout(t)
  },[])

  return (
    <div style={{position:'fixed', right:18, bottom:18, background:'#f7efe1', color:'#114B2B', padding:'12px 16px', borderRadius:8, boxShadow:'0 8px 22px rgba(17,75,43,0.08)'}}>
      {message}
    </div>
  )
}
