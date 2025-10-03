// src/pages/Journal.jsx
import { Box, VStack, Textarea, Button, Text, Spinner } from '@chakra-ui/react';
import CalendarView from '../components/calendarview';
import SaveButton from '../components/SaveButton';
import EmailInput from '../components/EmailInput';
import { useState } from 'react';

export default function Journal() {
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');

  // Gemini integration removed; keep a placeholder for future server-side helpers
  function askGemini() {
    setReply('Gemini integration removed from this repository.');
  }
  return (
    <Box p={8}>
      <VStack spacing={6}>
        <CalendarView />
  <EmailInput />
  <Textarea placeholder="Write your thoughts here..." />
        <Box>
          <Button colorScheme="teal" onClick={askGemini}>
            Ask (disabled)
          </Button>
          <Box mt={3} p={3} bg="gray.50" borderRadius="md">
            <Text whiteSpace="pre-wrap">{reply || 'Server-side LLM support has been removed.'}</Text>
          </Box>
        </Box>
        <SaveButton />
      </VStack>
    </Box>
  );
}