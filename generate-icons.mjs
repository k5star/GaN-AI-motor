// generate-icons.mjs — run once: node generate-icons.mjs
// Generates 4 PNG app icons matching the GaN Motor AI nav logo style.
// Delete this file after icons are generated.
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('icons', { recursive: true });

function drawIcon(size, maskable = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const center = size / 2;
  // Maskable safe zone: 80% (10% padding each side)
  const padding = maskable ? size * 0.1 : 0;

  // Dark slate background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, size, size);

  // Rounded rect background highlight (subtle)
  const rectPad = padding + size * 0.08;
  const radius = (size - rectPad * 2) * 0.25;
  const x = rectPad, y = rectPad, w = size - rectPad * 2, h = size - rectPad * 2;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = '#1e293b';
  ctx.fill();

  // Cyan circle (matches nav logo bg-cyan-500)
  const circleR = (size / 2 - padding) * 0.52;
  ctx.beginPath();
  ctx.arc(center, center, circleR, 0, Math.PI * 2);
  ctx.fillStyle = '#22d3ee';
  ctx.fill();

  // White "G" letter
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(size * 0.38)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('G', center, center + size * 0.025);

  return canvas.toBuffer('image/png');
}

writeFileSync('icons/icon-192.png', drawIcon(192));
writeFileSync('icons/icon-512.png', drawIcon(512));
writeFileSync('icons/icon-maskable-512.png', drawIcon(512, true));

// Apple touch icon (180x180)
const buf180 = drawIcon(180);
writeFileSync('icons/apple-touch-icon-180.png', buf180);

console.log('✓ icons/icon-192.png');
console.log('✓ icons/icon-512.png');
console.log('✓ icons/icon-maskable-512.png');
console.log('✓ icons/apple-touch-icon-180.png');
console.log('Done. You can now delete generate-icons.mjs');
