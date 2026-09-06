import images from '@/lib/generated-images.json';

export default function StoreImage({ src, alt, width, height, sizes = '(max-width: 600px) 100vw, 50vw', loading = 'lazy', fetchPriority, ...props }) {
  const image = images[src];
  return <img {...props} src={image?.src || src} alt={alt} srcSet={image?.srcSet}
    sizes={image ? sizes : undefined} width={width || image?.width} height={height || image?.height}
    loading={fetchPriority === 'high' ? undefined : loading} fetchPriority={fetchPriority} />;
}
