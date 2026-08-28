#!/usr/bin/env node
/**
 * Normalizes public/images/tiles/*.png so every resource's painted hexagon fills the
 * exact same canvas (866x1000, the sqrt(3)/2 hex width:height ratio). Source art from
 * an image generator rarely has the hex inset by identical margins, and HexTile.tsx
 * places the image straight onto the polygon's bounding box with no per-tile offset —
 * so any misalignment here shows up as ragged seams between adjacent board tiles.
 *
 * Run after adding or replacing tile art:
 *   node scripts/normalize-tile-art.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const TILES_DIR = path.join(process.cwd(), 'public/images/tiles');
const TARGET_W = 866;
const TARGET_H = 1000;
const ALPHA_THRESHOLD = 10;

async function normalizeTile(file) {
  const p = path.join(TILES_DIR, file);
  const { data, info } = await sharp(p).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      if (data[idx + 3] > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const bboxW = maxX - minX + 1;
  const bboxH = maxY - minY + 1;
  const tmp = p + '.tmp.png';
  await sharp(p)
    .extract({ left: minX, top: minY, width: bboxW, height: bboxH })
    .resize(TARGET_W, TARGET_H, { fit: 'fill' })
    .toFile(tmp);
  fs.renameSync(tmp, p);
  console.log(file, 'bbox', { minX, maxX, minY, maxY }, '-> normalized', `${TARGET_W}x${TARGET_H}`);
}

const files = fs.readdirSync(TILES_DIR).filter(f => f.endsWith('.png'));
for (const file of files) {
  await normalizeTile(file);
}
