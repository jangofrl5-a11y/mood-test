// src/pages/Journal.jsx
import { Box, VStack, Textarea } from '@chakra-ui/react';
import CalendarView from '../components/calendarview';
import SaveButton from '../components/SaveButton';

export default function Journal() {
  return (
    <Box p={8}>
      <VStack spacing={6}>
        <CalendarView />
        <Textarea placeholder="Write your thoughts here..." />
        <SaveButton />
      </VStack>
    </Box>
  );
}