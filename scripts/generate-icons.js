import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

// Minimal compliant PNG generator for PWA icon requirements
function createSolidPNG(width, height, drawFn) {
  const bytesPerPixel = 4;
  const rowSize = width * bytesPerPixel + 1; // 1 filter byte per row
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type 6 (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Artwork drawing logic (Cyber Cave Droid motif)
function drawCaveDroidIcon(x, y, w, h) {
  const nx = (x / w) * 2 - 1; // -1 to 1
  const ny = (y / h) * 2 - 1;
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Background dark gradient with rounded corners
  const cornerRadius = 0.85;
  if (Math.abs(nx) > cornerRadius && Math.abs(ny) > cornerRadius) {
    const cx = Math.abs(nx) - cornerRadius;
    const cy = Math.abs(ny) - cornerRadius;
    if (cx * cx + cy * cy > 0.02) {
      return [0, 0, 0, 0]; // transparent outside rounded corner
    }
  }

  // Base cavern dark blue-slate
  let r = 8, g = 14, b = 26, a = 255;

  // Outer border ring
  if (dist > 0.88 && dist < 0.94) {
    return [2, 132, 199, 230]; // Cyan border
  }

  // Cavern stalactite jagged lines
  if (ny < -0.4) {
    const wave = Math.sin(nx * 14) * 0.15 - 0.65;
    if (ny < wave) {
      return [15, 23, 42, 255]; // Dark rock ceiling
    }
  }
  if (ny > 0.45) {
    const wave = Math.cos(nx * 14) * 0.15 + 0.65;
    if (ny > wave) {
      return [15, 23, 42, 255]; // Dark rock floor
    }
  }

  // Tunnel depth rings
  if (Math.abs(dist - 0.65) < 0.015 || Math.abs(dist - 0.42) < 0.015) {
    return [14, 165, 233, 100];
  }

  // Ship Fighter in center
  // Fuselage triangle: apex at (0, -0.45), base from (-0.25, 0.25) to (0.25, 0.25)
  if (ny > -0.45 && ny < 0.25) {
    const halfWidth = ((ny + 0.45) / 0.7) * 0.28;
    if (Math.abs(nx) < halfWidth) {
      // Inside main ship hull
      const cockpitHalf = ((ny + 0.3) / 0.4) * 0.1;
      if (ny > -0.3 && ny < 0.1 && Math.abs(nx) < cockpitHalf) {
        return [56, 189, 248, 255]; // Glowing cyan cockpit
      }
      return [30, 41, 59, 255]; // Dark metallic hull
    }
  }

  // Swept Wings
  if (ny > 0.05 && ny < 0.32) {
    const wingX = Math.abs(nx);
    if (wingX > 0.15 && wingX < 0.55 && (ny - 0.05) < (wingX - 0.15) * 0.5) {
      return [3, 105, 161, 255]; // Wing blue
    }
  }

  // Thruster plume behind ship
  if (ny >= 0.25 && ny <= 0.6) {
    const plumeHalf = (1 - (ny - 0.25) / 0.35) * 0.12;
    if (Math.abs(nx) < plumeHalf) {
      if (Math.abs(nx) < plumeHalf * 0.4) {
        return [255, 255, 255, 255]; // White hot core
      }
      return [245, 158, 11, 230]; // Orange flame
    }
  }

  return [r, g, b, a];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createSolidPNG(192, 192, drawCaveDroidIcon));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createSolidPNG(512, 512, drawCaveDroidIcon));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createSolidPNG(512, 512, drawCaveDroidIcon));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createSolidPNG(180, 180, drawCaveDroidIcon));

console.log('Successfully generated PWA & Android app icons in public/');
