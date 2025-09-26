import { readFileSync } from 'fs'
import { describe, it, expect } from 'vitest'

describe('mood.jsx content', () => {
  it('contains accessible dua selection label and select', () => {
    const content = readFileSync(new URL('../src/pages/mood.jsx', import.meta.url), 'utf8')
    expect(content).toContain('id="duaSelection"')
    expect(content).toContain('name="duaSelection"')
    expect(content).toContain('📿 Add a Dua or Ayah')
  })
})
