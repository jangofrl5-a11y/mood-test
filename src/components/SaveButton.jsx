import { Button, Box } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useState, useEffect } from 'react';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;
export function SaveButton() {
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isSaving) {
      const timer = setTimeout(() => setIsSaving(false), 2000); // simulate save
      return () => clearTimeout(timer);
    }
  }, [isSaving]);

  return (
    <Button
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
    </Button>
  );
}

export default SaveButton;