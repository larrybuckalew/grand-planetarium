import type { Planet } from '@/data/types';

function makeCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  return { canvas, ctx };
}

/** Deterministic pseudo-noise so textures are stable between reloads. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

export function makePlanetTexture(planet: Planet, id: Planet['id']): HTMLCanvasElement {
  const W = 512;
  const H = 256;
  const { canvas, ctx } = makeCanvas(W, H);
  const rand = mulberry32(
    id.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7),
  );
  const base = hexToRgb(planet.color);
  const accent = hexToRgb(planet.accentColor);

  const isGiant = planet.kind !== 'Rocky world';

  // Horizontal base bands.
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const band = isGiant
      ? 0.5 + 0.5 * Math.sin(t * Math.PI * (6 + (planet.size > 2 ? 4 : 2)) + Math.sin(t * 11) * 0.6)
      : 0.5 + 0.35 * Math.sin(t * Math.PI * 3 + 1.2);
    ctx.fillStyle = mix(base, accent, band * 0.55);
    ctx.fillRect(0, y, W, 1);
  }

  // Surface mottling / cloud streaks.
  const streaks = isGiant ? 140 : 320;
  for (let i = 0; i < streaks; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const w = isGiant ? 30 + rand() * 120 : 6 + rand() * 34;
    const h = isGiant ? 1.5 + rand() * 4 : 2 + rand() * 10;
    const t = rand();
    ctx.fillStyle = mix(base, accent, 0.25 + t * 0.6);
    ctx.globalAlpha = 0.06 + rand() * 0.16;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Signature features.
  if (id === 'jupiter') {
    // Great Red Spot.
    const cx = W * 0.68;
    const cy = H * 0.62;
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 42);
    grad.addColorStop(0, 'rgba(190,80,50,0.95)');
    grad.addColorStop(0.6, 'rgba(160,70,48,0.6)');
    grad.addColorStop(1, 'rgba(160,70,48,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 44, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (id === 'mars') {
    // Polar caps.
    for (const [y0, spread] of [
      [0, 26],
      [H, 26],
    ] as const) {
      const grad = ctx.createLinearGradient(0, y0 === 0 ? 0 : H - spread, 0, y0 === 0 ? spread : H);
      grad.addColorStop(0, 'rgba(240,236,228,0.85)');
      grad.addColorStop(1, 'rgba(240,236,228,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y0 === 0 ? 0 : H - spread, W, spread);
    }
  }
  if (id === 'earth') {
    // Continents: blobby green-brown clusters.
    for (let i = 0; i < 26; i++) {
      const x = rand() * W;
      const y = H * 0.16 + rand() * H * 0.68;
      ctx.fillStyle = mix(accent, hexToRgb('#8C7A4E'), rand());
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      for (let b = 0; b < 7; b++) {
        const bx = x + (rand() - 0.5) * 90;
        const by = y + (rand() - 0.5) * 34;
        const r = 6 + rand() * 22;
        ctx.moveTo(bx + r, by);
        ctx.arc(bx, by, r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    // Clouds.
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = 'rgba(245,246,240,0.9)';
    for (let i = 0; i < 90; i++) {
      const x = rand() * W;
      const y = rand() * H;
      ctx.beginPath();
      ctx.ellipse(x, y, 14 + rand() * 40, 2 + rand() * 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (id === 'neptune' || id === 'uranus') {
    // Faint methane haze bands.
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = 'rgba(235,245,250,0.9)';
    for (let i = 0; i < 26; i++) {
      const y = rand() * H;
      ctx.fillRect(0, y, W, 1 + rand() * 3);
    }
    ctx.globalAlpha = 1;
  }

  return canvas;
}

export function makeRingTexture(): HTMLCanvasElement {
  const W = 512;
  const H = 32;
  const { canvas, ctx } = makeCanvas(W, H);
  const rand = mulberry32(42);
  for (let x = 0; x < W; x++) {
    const t = x / W;
    // Gaps: Cassini-division-like.
    const gap = Math.abs(t - 0.62) < 0.035 ? 0.15 : Math.abs(t - 0.3) < 0.02 ? 0.4 : 1;
    const density = (0.5 + 0.5 * Math.sin(t * 60) * Math.sin(t * 17 + 2)) * gap;
    const alpha = Math.max(0, density) * (0.25 + rand() * 0.75);
    ctx.fillStyle = `rgba(214,194,148,${alpha.toFixed(3)})`;
    ctx.fillRect(x, 0, 1, H);
  }
  return canvas;
}

export function makeGlowTexture(size = 256): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,236,190,1)');
  g.addColorStop(0.25, 'rgba(255,196,110,0.55)');
  g.addColorStop(0.6, 'rgba(230,140,60,0.16)');
  g.addColorStop(1, 'rgba(200,110,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

export function makeStarTexture(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,252,240,1)');
  g.addColorStop(0.35, 'rgba(255,244,220,0.6)');
  g.addColorStop(1, 'rgba(255,244,220,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return canvas;
}
