#!/usr/bin/env node
// Generate brand raster assets (logo.png, apple-touch-icon.png, og-default.png)
import path from 'node:path';
import sharp from 'sharp';

const PUB = path.resolve(import.meta.dirname, '../public');

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">
  <defs>
    <linearGradient id="txt" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d8f8f"/><stop offset="1" stop-color="#21b5b5"/>
    </linearGradient>
    <radialGradient id="b1" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ADFFFF" stop-opacity="0.95"/><stop offset="70%" stop-color="#ADFFFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="b2" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#C9FFFF" stop-opacity="0.9"/><stop offset="70%" stop-color="#C9FFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1536" height="1024" fill="#ffffff"/>
  <circle cx="240" cy="200" r="440" fill="url(#b1)"/>
  <circle cx="1320" cy="900" r="500" fill="url(#b2)"/>
  <rect x="40" y="40" width="1456" height="944" rx="40" fill="none" stroke="#ADFFFF" stroke-width="3"/>
  <g font-family="'Space Grotesk','Arial',sans-serif">
    <text x="120" y="300" font-size="34" letter-spacing="8" fill="#0a6e6e" font-weight="600">LE MAGAZINE INDÉPENDANT</text>
    <circle cx="130" cy="430" r="26" fill="#ADFFFF" stroke="#21b5b5" stroke-width="3"/>
    <text x="185" y="560" font-size="150" font-weight="700" fill="#06110f" letter-spacing="-4">fr<tspan fill="#21b5b5">·</tspan>business</text>
    <text x="122" y="690" font-size="52" font-weight="500" fill="url(#txt)">Business · Tech · Argent · Art de vivre</text>
    <text x="122" y="900" font-size="34" fill="#5a736e">Des analyses claires pour décider mieux.</text>
  </g>
</svg>`;

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="200" viewBox="0 0 640 200">
  <rect width="640" height="200" fill="#ffffff"/>
  <circle cx="60" cy="100" r="26" fill="#ADFFFF" stroke="#21b5b5" stroke-width="4"/>
  <text x="110" y="132" font-family="'Space Grotesk','Arial',sans-serif" font-size="82" font-weight="700" fill="#06110f" letter-spacing="-3">fr<tspan fill="#21b5b5">·</tspan>business</text>
</svg>`;

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ADFFFF"/><stop offset="1" stop-color="#4fe0e0"/></linearGradient></defs>
  <rect width="180" height="180" rx="42" fill="#ffffff"/>
  <rect x="8" y="8" width="164" height="164" rx="36" fill="none" stroke="url(#g)" stroke-width="7"/>
  <circle cx="56" cy="90" r="20" fill="url(#g)"/>
  <path d="M96 124V60h26a20 20 0 0 1 0 40H96m26 0 18 28" fill="none" stroke="#06110f" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

await sharp(Buffer.from(ogSvg)).png().toFile(path.join(PUB, 'og-default.png'));
await sharp(Buffer.from(logoSvg)).png().toFile(path.join(PUB, 'logo.png'));
await sharp(Buffer.from(iconSvg)).resize(180, 180).png().toFile(path.join(PUB, 'apple-touch-icon.png'));
console.log('brand assets written: og-default.png, logo.png, apple-touch-icon.png');
