// src/pages/Journal.jsx
import { Box, VStack, Textarea, Button, Text, Spinner } from '@chakra-ui/react';
import CalendarView from '../components/calendarview';
import SaveButton from '../components/SaveButton';
import EmailInput from '../components/EmailInput';
import { useState } from 'react';
import { generateText } from '../utils/geminiClient';

export default function Journal() {
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');

  async function askGemini() {
    setLoading(true);
    setReply('');
    try {
      const res = await generateText('Write a one-sentence gentle reminder to pray on time.');
      // If the proxy returns JSON, try to extract a text field, otherwise stringify
      let out = res;
      if (res && typeof res === 'object') {
        out = JSON.stringify(res, null, 2);
        if (res.candidates && res.candidates[0] && res.candidates[0].content) {
          out = res.candidates[0].content;
        }
      }
      setReply(String(out));
    } catch (err) {
      setReply('Error: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }
  return (
    <Box p={8}>
      <VStack spacing={6}>
        <CalendarView />
  <EmailInput />
  <Textarea placeholder="Write your thoughts here..." />
        <Box>
          <Button colorScheme="teal" onClick={askGemini} isDisabled={loading}>
            {loading ? <><Spinner size="sm" mr={2} /> Asking...</> : 'Ask Gemini' }
          </Button>
          <Box mt={3} p={3} bg="gray.50" borderRadius="md">
            <Text whiteSpace="pre-wrap">{reply || 'Gemini response will appear here.'}</Text>
          </Box>
        </Box>
        <SaveButton />
      </VStack>
    </Box>
  );
}