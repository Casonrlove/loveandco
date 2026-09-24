'use client';

import { useEffect, useState } from 'react';

const fallback = { label: 'Custom-made with care', detail: 'Current timing is confirmed with every order.' };

export default function TurnaroundNote({ compact = false }) {
  const [current, setCurrent] = useState(fallback);
  useEffect(() => {
    let active = true;
    fetch('/api/turnaround', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((value) => { if (active && value?.label) setCurrent(value); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return (
    <p className={`timing-note${compact ? ' is-compact' : ''}`}>
      <strong>{current.label}</strong>
      {!compact && current.detail ? <span>{current.detail}</span> : null}
    </p>
  );
}
