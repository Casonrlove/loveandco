'use client';

import { useEffect, useState } from 'react';

export default function TurnaroundNote({ turnaround, compact = false }) {
  const [live, setLive] = useState(turnaround || null);

  useEffect(() => {
    if (turnaround) {
      setLive(turnaround);
      return;
    }
    let ignore = false;
    fetch('/api/turnaround')
      .then((response) => response.json())
      .then((data) => { if (!ignore) setLive(data); })
      .catch(() => {});
    return () => { ignore = true; };
  }, [turnaround]);

  if (!live?.label) return null;

  return (
    <p className={`timing-note${compact ? ' is-compact' : ''}`}>
      <strong>{live.label}</strong>
      {!compact && live.detail ? <span>{live.detail}</span> : null}
    </p>
  );
}
