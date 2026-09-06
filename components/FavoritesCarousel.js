'use client';

import StoreImage from './StoreImage';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';

export default function FavoritesCarousel({ items }) {
  const [index, setIndex] = useState(0);
  const count = items.length;

  if (!count) return null;
  const visibleCount = Math.min(3, count);
  const visible = Array.from({ length: visibleCount }, (_, offset) => items[(index + offset) % count]);

  const go = (next) => setIndex((next + count) % count);

  return (
    <div
      className="favorites-carousel"
    >
      <div className="favorites-stage">
        <div className="favorites-track">
          {visible.map((item) => (
            <Link className="favorites-slide" href={item.href} key={item.href}>
              <StoreImage src={item.image} alt={item.name} width="600" height="600" loading="lazy" />
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
