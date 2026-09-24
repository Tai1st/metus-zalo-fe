// Regenerates the favicon files from public/logo.svg — the single source of
// truth for the app's logo. Run after editing public/logo.svg:
//   npm run sync:logo
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = path.join(root, "public", "logo.svg");
const svg = readFileSync(source);

// Next's app/icon.* file convention needs a literal file under src/app —
// it can't read from public/ at request time, so we keep a synced copy.
writeFileSync(path.join(root, "src", "app", "icon.svg"), svg);

const density = 540; // 24 viewBox units * 540/72 = 180px
await sharp(svg, { density }).png().toFile(path.join(root, "src", "app", "apple-icon.png"));

// Chrome/OS look up /favicon.ico directly, bypassing icon.svg — without this
// they'd keep showing Next.js's scaffold default. Modern .ico files can embed
// PNG frames directly (no legacy BMP encoding needed), so build one by hand.
const pngSizes = [16, 32, 48];
const pngs = await Promise.all(
  pngSizes.map((size) => sharp(svg, { density: (size / 24) * 72 }).png().toBuffer()),
);
writeFileSync(path.join(root, "src", "app", "favicon.ico"), buildIco(pngs, pngSizes));

console.log("Synced icon.svg, apple-icon.png and favicon.ico from public/logo.svg");

function buildIco(pngBuffers, sizes) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const dirEntries = [];
  for (let i = 0; i < count; i++) {
    const size = sizes[i];
    const png = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8); // data size
    entry.writeUInt32LE(offset, 12); // data offset
    dirEntries.push(entry);
    offset += png.length;
  }
  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}
