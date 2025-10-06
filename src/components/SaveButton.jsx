import { keyframes } from '@emotion/react';
import React, { useState, useEffect } from 'react';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;
export function SaveButton() {
  const [isSaving, setIsSaving] = useState(false);
  const [Chakra, setChakra] = useState(null);

  useEffect(() => {
    let mounted = true
    if (typeof window !== 'undefined' && window.__chakra_available) {
      import('@chakra-ui/react').then(mod => { if (mounted) setChakra(mod) }).catch(() => {})
    }
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (isSaving) {
      const timer = setTimeout(() => setIsSaving(false), 2000); // simulate save
      return () => clearTimeout(timer);
    }
  }, [isSaving]);

  const ChakraButton = Chakra?.Button

  if (ChakraButton) {
    return (
      <ChakraButton
        onClick={() => setIsSaving(true)}
        position="relative"
        overflow="hidden"
        bgGradient={isSaving ? 'linear(to-r, teal.300, teal.500, teal.300)' : 'teal.400'}
        color="white"
        _hover={{ bg: 'teal.500' }}
        animation={isSaving ? `${shimmer} 1.5s linear infinite` : 'none'}
        backgroundSize="200% auto"
      >
        {isSaving ? 'Saving...' : 'Save Entry'}
      </ChakraButton>
    )
  }

  // Fallback plain button
  return (
    <button
      onClick={() => setIsSaving(true)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: isSaving ? 'linear-gradient(90deg,#38b2ac,#2c7a7b,#38b2ac)' : '#38b2ac',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: 6,
        cursor: 'pointer'
      }}
    >
      {isSaving ? 'Saving...' : 'Save Entry'}
    </button>
  )
}

export default SaveButton;