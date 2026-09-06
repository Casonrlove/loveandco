// Preserve the original photo source and dimensions. Public page caching is
// independent of image delivery; uploads remain optimized when they are saved.
export default function StoreImage({ src, alt, width, height, loading = 'lazy', fetchPriority, sizes: _sizes, ...props }) {
  return <img {...props} src={src} alt={alt} width={width} height={height}
    loading={fetchPriority === 'high' ? undefined : loading} fetchPriority={fetchPriority} />;
}
