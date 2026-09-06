'use client';

import StoreImage from './StoreImage';

import { useRef, useState } from 'react';

export default function ProductGallery(props) {
  return <Gallery key={(props.images || []).join('|')} {...props} />;
}

function Gallery({ images, name, compact, onActivate }) {
  const photos = (images || []).filter(Boolean);
  const scroller = useRef(null);
  const pointer = useRef(null);
  const drag = useRef(null);
  const [index, setIndex] = useState(0);

  if (photos.length === 0) return null;

  const goTo = (next) => {
    const el = scroller.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(photos.length - 1, next));
    setIndex(clamped);
    el.scrollTo({ left: clamped * el.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el || !el.clientWidth) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index && next >= 0 && next < photos.length) setIndex(next);
  };

  const onPointerDown = (event) => {
    const el = scroller.current;
    pointer.current = { x: event.clientX, y: event.clientY };
    if (!el || photos.length < 2) return;
    drag.current = { startX: event.clientX, startScroll: el.scrollLeft };
    el.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    const el = scroller.current;
    const current = drag.current;
    if (!el || !current) return;
    el.scrollLeft = current.startScroll - (event.clientX - current.startX);
  };

  const onPointerUp = (event) => {
    const start = pointer.current;
    const el = scroller.current;
    pointer.current = null;
    drag.current = null;
    if (el && photos.length > 1) goTo(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)));
    if (!start || !onActivate) return;
    const dx = Math.abs(event.clientX - start.x);
    const dy = Math.abs(event.clientY - start.y);
    if (dx < 10 && dy < 10) onActivate();
  };

  return (
    <div className={`item-gallery${compact ? ' is-compact' : ''}${photos.length > 1 ? ' is-swipeable' : ''}`}>
      <div
        className="item-swipe"
        ref={scroller}
        role={onActivate ? 'button' : undefined}
        tabIndex={onActivate ? 0 : undefined}
        aria-label={onActivate ? `View ${name}` : undefined}
        onKeyDown={(event) => {
          if (onActivate && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onActivate(); }
        }}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {photos.map((src) => (
          <StoreImage key={src} src={src} alt={name} width="600" height="600" loading="lazy" draggable={false} />
        ))}
      </div>
      {photos.length > 1 && (
        <div className="item-dots" aria-label="Product photos">
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              className={i === index ? 'is-active' : ''}
              onClick={(event) => { event.preventDefault(); event.stopPropagation(); goTo(i); }}
              aria-label={`Photo ${i + 1} of ${photos.length}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
