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
  const visibleCount = Math.min(6, count);
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
            <Link className="product-card" href={item.href} key={`${item.href}-${index}`}>
              <img src={item.image} alt={item.name} />
              <div className="product-card-body">
                <h3>{item.name}</h3>
                <div className="product-card-foot">
                  <strong>{item.price}</strong>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {count > 1 && (
          <>
            <button type="button" className="favorites-nav is-prev" onClick={() => go(index - 1)} aria-label="Previous favorite">
              <ChevronLeft aria-hidden="true" />
            </button>
            <button type="button" className="favorites-nav is-next" onClick={() => go(index + 1)} aria-label="Next favorite">
              <ChevronRight aria-hidden="true" />
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
