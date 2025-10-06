import { readFileSync } from 'fs'
import { describe, it, expect } from 'vitest'

describe('mood.jsx content', () => {
  it('contains the journal heading and textarea', () => {
    const content = readFileSync(new URL('../src/pages/mood.jsx', import.meta.url), 'utf8')
    expect(content).toContain('🌙 Islamic Mood Journal')
    expect(content).toContain('id="journalEntry"')
    expect(content).toContain('Write your thoughts here...')
  })
})
