import generatedImages from '@/lib/generated-images.json';

// Keep small originals intact. Large library photos use build-time variants;
// uploaded and third-party photos retain their existing URLs.
export default function StoreImage({ src, alt, width, height, loading = 'lazy', fetchPriority, sizes, ...props }) {
  const image = typeof src === 'string' ? generatedImages[src] : null;
  const responsive = image && image.originalBytes > 512 * 1024;
  return <img {...props}
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
