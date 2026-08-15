'use client';

import { useEffect, useState } from 'react';
import { formatPhoneInput } from '@/lib/phone';

export default function PhoneInput({ value, defaultValue = '', onChange, name, required, autoComplete = 'tel', placeholder = '555-123-4567' }) {
  const [local, setLocal] = useState(() => formatPhoneInput(value ?? defaultValue));

  useEffect(() => {
    if (value !== undefined) setLocal(formatPhoneInput(value));
  }, [value]);

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
      value={local}
      onChange={handleChange}
    />
  );
}
