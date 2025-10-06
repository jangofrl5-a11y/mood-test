import React, { useState, useEffect } from 'react';

// Chakra components are loaded dynamically when available; fallback to plain HTML controls.


export default function EmailInput({ id = 'userEmail', onChange }) {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const [Chakra, setChakra] = useState(null);

  useEffect(()=>{
    let mounted = true
    if (typeof window !== 'undefined' && window.__chakra_available) {
      import('@chakra-ui/react').then(mod => { if (mounted) setChakra(mod) }).catch(()=>{})
    }
    return ()=> { mounted = false }
  }, [])

  const validate = (v) => {
    if (!v) return 'Please enter your email.';
    // simple RFC-light email check
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    return ok ? '' : 'Please enter a valid email address.';
  };

  const error = touched ? validate(value) : '';

  function handleChange(e) {
    const v = e.target.value;
    setValue(v);
    if (onChange) onChange(v);
  }

  if (Chakra) {
    const { FormControl, FormLabel, Input, FormErrorMessage, FormHelperText } = Chakra
    return (
      <FormControl id={id} isInvalid={!!error} isRequired>
        <FormLabel>Email</FormLabel>
        <Input
          type="email"
          value={value}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          placeholder="you@example.com"
          autoComplete="email"
        />
        {error ? (
          <FormErrorMessage>{error}</FormErrorMessage>
        ) : (
          <FormHelperText>We’ll only use this to contact you about your entries.</FormHelperText>
        )}
      </FormControl>
    )
  }

  // Plain HTML fallback
  return (
    <div id={id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontWeight: 600 }}>Email</label>
      <input
        type="email"
        value={value}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        placeholder="you@example.com"
        autoComplete="email"
        style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
      />
      <div style={{ color: error ? 'crimson' : '#666', fontSize: 13 }}>{error || 'We’ll only use this to contact you about your entries.'}</div>
    </div>
  )
}
