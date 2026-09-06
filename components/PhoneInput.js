'use client';

import { useState } from 'react';
import { formatPhoneInput } from '@/lib/phone';

export default function PhoneInput({ value, defaultValue = '', onChange, name, required, autoComplete = 'tel', placeholder = '555-123-4567' }) {
  const [local, setLocal] = useState(() => formatPhoneInput(value ?? defaultValue));

  const handleChange = (event) => {
    const next = formatPhoneInput(event.target.value);
    setLocal(next);
    onChange?.(next);
  };

  return (
    <input
      type="tel"
      inputMode="tel"
      autoComplete={autoComplete}
      name={name}
      required={required}
      placeholder={placeholder}
      value={value === undefined ? local : formatPhoneInput(value)}
      onChange={handleChange}
    />
  );
}
