'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchTurnaround } from '@/lib/turnaround-client';

const fallback = { label: 'Custom-made with care', detail: 'I confirm timing with every order.' };

export default function TurnaroundNote({ compact = false }) {
  const [current, setCurrent] = useState(fallback);
  useEffect(() => {
    let active = true;
    fetchTurnaround().then((value) => { if (active && value?.label) setCurrent(value); });
    return () => { active = false; };
  }, []);
  return (
    <p className={`timing-note${compact ? ' is-compact' : ''}`}>
      <strong>{current.label}</strong>
      {!compact && current.detail ? <span>{current.detail} <Link href="/shop-info">Shop info</Link></span> : null}
    </p>
  );
}
