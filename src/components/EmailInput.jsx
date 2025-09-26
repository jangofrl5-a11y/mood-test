import { useState } from 'react';
import { FormControl, FormLabel, Input, FormErrorMessage, FormHelperText } from '@chakra-ui/react';

export default function EmailInput({ id = 'userEmail', onChange }) {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);

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
  );
}
