import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

sharp.concurrency(2);
const root = path.resolve('public/images');
const output = path.resolve('public/media');
await mkdir(output, { recursive: true });
const manifest = {};
let originalBytes = 0;
let deliveryBytes = 0;

for (const file of (await readdir(root, { recursive: true })).sort()) {
  if (!/\.(jpe?g|png)$/i.test(file)) continue;
  const bytes = await readFile(path.join(root, file));
  const hash = createHash('sha256').update(bytes).update('webp-78-v1').digest('hex').slice(0, 16);
  let metadata;
  try { metadata = await sharp(bytes).metadata(); }
  catch {
    console.warn(`Skipped unreadable image: ${file}. Its original remains unchanged.`);
    continue;
  }
  const rotated = [5, 6, 7, 8].includes(metadata.orientation);
  const width = rotated ? metadata.height : metadata.width;
  const height = rotated ? metadata.width : metadata.height;
  const variants = [];
  for (const size of [...new Set([480, 960, 1440].map((size) => Math.min(size, width)))]) {
    const name = `${hash}-${size}.webp`;
    const target = path.join(output, name);
    if (!(await stat(target).catch(() => null))) {
      await sharp(bytes).rotate().resize({ width: size, withoutEnlargement: true }).webp({ quality: 78 }).toFile(target);
    }
    variants.push({ size, src: `/media/${name}`, bytes: (await stat(target)).size });
  }
  const fallback = variants.find((variant) => variant.size >= 960) || variants.at(-1);
  manifest[`/images/${file.split(path.sep).join('/')}`] = {
    width, height, src: fallback.src,
    srcSet: variants.map(({ size, src }) => `${src} ${size}w`).join(', '),
  };
  originalBytes += bytes.length;
  deliveryBytes += fallback.bytes;
}
await writeFile('lib/generated-images.json', `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Prepared ${Object.keys(manifest).length} static images. Originals: ${(originalBytes / 1048576).toFixed(1)} MB; default delivery variants: ${(deliveryBytes / 1048576).toFixed(1)} MB.`);
