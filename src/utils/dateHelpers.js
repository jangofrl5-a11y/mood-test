// small collection of date helpers used by the app and tests
export function ensureDate(input){
  try{
    if(input instanceof Date) return new Date(input.getTime())
    if(typeof input === 'number') return new Date(input)
    if(typeof input === 'string'){
      const parsed = new Date(input)
      if(!isNaN(parsed.getTime())) return parsed
    }
    if(input && typeof input === 'object' && input.year && input.month && input.day){
      return new Date(Number(input.year), Number(input.month)-1, Number(input.day))
    }
  }catch(e){}
  return new Date()
}

export const formatDate = (d) => {
  try{ const dt = ensureDate(d); return dt.toISOString().split('T')[0] }catch(e){ return new Date().toISOString().split('T')[0] }
}

export function parseTimeToDate(baseDate, hhmm){
  const m = String(hhmm||'').match(/^([0-2]?\d):([0-5]\d)$/)
  if(!m) return null
  const hh = Number(m[1])
  const mm = Number(m[2])
  const d = ensureDate(baseDate)
  d.setHours(hh, mm, 0, 0)
  return d
}

export default { ensureDate, formatDate, parseTimeToDate }
