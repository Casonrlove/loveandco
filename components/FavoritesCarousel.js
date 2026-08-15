'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';

export default function FavoritesCarousel({ items }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (!count) return null;
  const visibleCount = Math.min(3, count);
  const visible = Array.from({ length: visibleCount }, (_, offset) => items[(index + offset) % count]);

  const go = (next) => setIndex((next + count) % count);

  return (
    <div
      className="favorites-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="favorites-stage">
        <div className="favorites-track">
          {visible.map((item) => (
            <Link className="favorites-slide" href={item.href} key={`${item.href}-${index}`}>
              <img src={item.image} alt={item.name} />
              <div className="favorites-slide-copy">
                <h3>{item.name}</h3>
                <span>{item.price}</span>
              </div>
            </Link>
          ))}
        </div>
        {count > 1 && (
          <>
            <button type="button" className="favorites-nav is-prev" onClick={() => go(index - 1)} aria-label="Previous favorite">
              <ChevronLeft />
            </button>
            <button type="button" className="favorites-nav is-next" onClick={() => go(index + 1)} aria-label="Next favorite">
              <ChevronRight />
            </button>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="favorites-dots">
          {items.map((item, i) => (
            <button
              key={item.href}
              type="button"
              className={i === index ? 'is-active' : ''}
              onClick={() => setIndex(i)}
              aria-label={`Show ${item.name}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
