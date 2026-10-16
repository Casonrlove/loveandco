'use client';

import { useEffect, useRef, useState } from 'react';
import generatedImages from '@/lib/generated-images.json';

// Library photos use their build-time WebP variants (smaller than every original);
// uploaded and third-party photos retain their existing URLs.
// Images still loading after hydration fade in; cached or SSR-loaded ones show at once.
export default function StoreImage({ src, alt, width, height, loading = 'lazy', fetchPriority, sizes, className, onLoad, ...props }) {
  const ref = useRef(null);
  const [pending, setPending] = useState(false);
  useEffect(() => { if (!ref.current?.complete) setPending(true); }, [src]);
  const image = typeof src === 'string' ? generatedImages[src] : null;
  const responsive = Boolean(image);
  return <img {...props}
    ref={ref}
    className={[className, pending && 'is-pending'].filter(Boolean).join(' ') || undefined}
    onLoad={(event) => { setPending(false); onLoad?.(event); }}
    onError={() => setPending(false)}
    src={responsive ? image.src : src}
    srcSet={responsive ? image.srcSet : undefined}
    sizes={responsive ? sizes || '100vw' : undefined}
    alt={alt}
    width={width ?? image?.width}
    height={height ?? image?.height}
    loading={fetchPriority === 'high' ? undefined : loading}
    fetchPriority={fetchPriority}
  />;
}
