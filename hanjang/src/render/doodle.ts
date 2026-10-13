// 손그림(낙서) 스티커. 검은 테두리 + 파스텔 채우기로 직접 그린 오리지널 모양들.

import { F } from './fonts';

type C = CanvasRenderingContext2D;
export const LINE = '#262224';

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function outline(ctx: C, s: number) {
  ctx.strokeStyle = LINE;
  ctx.lineWidth = Math.max(2, s * 0.065);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

function heartPath(ctx: C, s: number) {
  const h = s * 0.5;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.75);
  ctx.bezierCurveTo(-h * 1.25, -h * 0.05, -h * 0.7, -h * 1.1, 0, -h * 0.45);
  ctx.bezierCurveTo(h * 0.7, -h * 1.1, h * 1.25, -h * 0.05, 0, h * 0.75);
  ctx.closePath();
}

export function heart(ctx: C, s: number, fill = '#FF6F86') {
  heartPath(ctx, s);
  ctx.fillStyle = fill;
  ctx.fill();
  outline(ctx, s);
  ctx.stroke();
  // 반짝임
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.beginPath();
  ctx.arc(-s * 0.16, -s * 0.12, s * 0.1, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
}

export function star(ctx: C, s: number, fill = '#FFD24D') {
  const R = s * 0.52;
  const r = R * 0.48;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  outline(ctx, s);
  ctx.stroke();
}

export function sparkle(ctx: C, s: number, fill = '#FFFFFF') {
  const R = s * 0.5;
  ctx.beginPath();
  ctx.moveTo(0, -R);
  ctx.quadraticCurveTo(R * 0.12, -R * 0.12, R, 0);
  ctx.quadraticCurveTo(R * 0.12, R * 0.12, 0, R);
  ctx.quadraticCurveTo(-R * 0.12, R * 0.12, -R, 0);
  ctx.quadraticCurveTo(-R * 0.12, -R * 0.12, 0, -R);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  outline(ctx, s);
  ctx.stroke();
}

export function flower(ctx: C, s: number, fill = '#B79CFF', center = '#FFD24D') {
  const pr = s * 0.2;
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * s * 0.26, Math.sin(a) * s * 0.26, pr, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    outline(ctx, s);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = center;
  ctx.fill();
  ctx.stroke();
}

function face(ctx: C, s: number, y = 0) {
  ctx.fillStyle = LINE;
  ctx.beginPath();
  ctx.arc(-s * 0.13, y, s * 0.045, 0, Math.PI * 2);
  ctx.arc(s * 0.13, y, s * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,120,140,0.55)';
  ctx.beginPath();
  ctx.ellipse(-s * 0.24, y + s * 0.08, s * 0.07, s * 0.04, 0, 0, Math.PI * 2);
  ctx.ellipse(s * 0.24, y + s * 0.08, s * 0.07, s * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = Math.max(1.5, s * 0.04);
  ctx.beginPath();
  ctx.arc(0, y + s * 0.03, s * 0.06, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
}

export function cloud(ctx: C, s: number, fill = '#FFFFFF') {
  ctx.beginPath();
  ctx.arc(-s * 0.22, s * 0.05, s * 0.2, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(-s * 0.02, -s * 0.12, s * 0.24, Math.PI, Math.PI * 1.95);
  ctx.arc(s * 0.24, s * 0.03, s * 0.2, Math.PI * 1.4, Math.PI * 0.5);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  outline(ctx, s);
  ctx.stroke();
  face(ctx, s * 0.9, s * 0.04);
}

/** 동글동글한 젤리 친구 (오리지널) */
export function blob(ctx: C, s: number, fill = '#8EE3D0') {
  ctx.beginPath();
  ctx.moveTo(-s * 0.4, s * 0.32);
  ctx.bezierCurveTo(-s * 0.48, -s * 0.15, -s * 0.28, -s * 0.48, 0, -s * 0.48);
  ctx.bezierCurveTo(s * 0.28, -s * 0.48, s * 0.48, -s * 0.15, s * 0.4, s * 0.32);
  ctx.quadraticCurveTo(0, s * 0.42, -s * 0.4, s * 0.32);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  outline(ctx, s);
  ctx.stroke();
  face(ctx, s, -s * 0.06);
}

export function squiggle(ctx: C, s: number, color = LINE) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, s * 0.09);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const x = (t - 0.5) * s;
    const y = Math.sin(t * Math.PI * 3) * s * 0.14;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
}

export function bubble(ctx: C, w: number, text: string, tailLeft: boolean) {
  const h = w * 0.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  outline(ctx, w * 0.6);
  ctx.stroke();
  // 꼬리
  const tx = tailLeft ? -w * 0.26 : w * 0.26;
  ctx.beginPath();
  ctx.moveTo(tx - w * 0.06, h * 0.38);
  ctx.lineTo(tx + (tailLeft ? -w * 0.12 : w * 0.12), h * 0.7);
  ctx.lineTo(tx + w * 0.07, h * 0.36);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.stroke();
  // 꼬리와 몸통 사이 선 지우기
  ctx.beginPath();
  ctx.moveTo(tx - w * 0.045, h * 0.37);
  ctx.lineTo(tx + w * 0.055, h * 0.355);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(3, w * 0.05);
  ctx.stroke();
  ctx.fillStyle = LINE;
  let fs = h * 0.42;
  ctx.font = `400 ${fs}px ${F.pen}`;
  while (ctx.measureText(text).width > w * 0.78 && fs > 10) {
    fs -= 1;
    ctx.font = `400 ${fs}px ${F.pen}`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, h * 0.02);
  ctx.textBaseline = 'alphabetic';
}

export const BUBBLE_TEXTS = ['또 찍자!', '우리 귀여워', '최고야', '찰칵!', '오늘 맑음', '행복해', '꺄아', '좋아좋아'];

type Sticker = (ctx: C, s: number) => void;
const PALETTE = ['#FF6F86', '#FFD24D', '#B79CFF', '#8EE3D0', '#FFB27A', '#8EC5FF'];

export const STICKERS: Sticker[] = [
  (c, s) => heart(c, s),
  (c, s) => star(c, s),
  (c, s) => flower(c, s, '#B79CFF'),
  (c, s) => sparkle(c, s * 0.9),
  (c, s) => cloud(c, s * 1.4),
  (c, s) => blob(c, s * 1.25, '#8EE3D0'),
  (c, s) => heart(c, s * 0.9, '#FF9EC2'),
  (c, s) => flower(c, s, '#FF9EC2', '#FFFFFF'),
  (c, s) => blob(c, s * 1.25, '#C7B4FF'),
];

/** 바탕에 흩뿌리는 작은 낙서 (사진 뒤에 그려져서 여백에만 보인다) */
export function scatterDoodles(ctx: C, W: number, H: number, seed: number, k: number, grid: boolean, avoid: Box[] = []) {
  const r = rng(seed);
  ctx.save();
  if (grid) {
    ctx.strokeStyle = 'rgba(120,140,170,0.18)';
    ctx.lineWidth = 1.5 * k;
    const step = 36 * k;
    for (let x = step; x < W; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = step; y < H; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }
  const n = Math.round(((W * H) / (1080 * 1920)) * 90 / (k * k));
  for (let i = 0; i < n; i++) {
    const x = r() * W;
    const y = r() * H;
    const t = r();
    const rot = (r() - 0.5) * 1.4;
    const sz = r();
    const col = r();
    if (avoid.some((b) => x > b.x - 30 * k && x < b.x + b.w + 30 * k && y > b.y - 30 * k && y < b.y + b.h + 30 * k)) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const color = PALETTE[Math.floor(col * PALETTE.length)];
    if (t < 0.4) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, (3 + sz * 5) * k, 0, Math.PI * 2);
      ctx.fill();
    } else if (t < 0.6) {
      squiggle(ctx, (30 + sz * 16) * k, color);
    } else if (t < 0.8) {
      sparkle(ctx, (22 + sz * 14) * k, '#FFFFFF');
    } else {
      heart(ctx, (20 + sz * 12) * k, PALETTE[Math.floor(col * 2)]);
    }
    ctx.restore();
  }
  ctx.restore();
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 사진 모서리에 겹쳐 붙이는 스티커와 말풍선.
 * 같은 seed면 같은 배치가 나와서, 두 줄 띠가 똑같이 꾸며진다.
 */
export function stickPhotos(ctx: C, rects: Box[], seed: number) {
  const r = rng(seed);
  const order = STICKERS.map((_, i) => i).sort(() => r() - 0.5);
  let si = 0;
  const texts = BUBBLE_TEXTS.slice().sort(() => r() - 0.5);
  let ti = 0;
  rects.forEach((b, i) => {
    const s = Math.min(b.w, b.h) * (0.2 + r() * 0.06);
    // 모서리 스티커 1~2개
    const corners: [number, number][] = [
      [b.x + b.w - s * 0.15, b.y + s * 0.15],
      [b.x + s * 0.15, b.y + b.h - s * 0.15],
      [b.x + b.w - s * 0.1, b.y + b.h - s * 0.2],
      [b.x + s * 0.2, b.y + s * 0.1],
    ];
    const picks = i % 2 ? [1, 2] : [0, 3];
    const count = rects.length <= 2 ? 2 : r() < 0.55 ? 1 : 2;
    for (let c = 0; c < count; c++) {
      const [x, y] = corners[picks[c]];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((r() - 0.5) * 0.6);
      STICKERS[order[si++ % order.length]](ctx, s);
      ctx.restore();
    }
    // 말풍선: 첫 사진과 (3장 이상이면) 세 번째 사진
    if (i === 0 || i === 2) {
      const bw = Math.min(b.w * 0.38, 210);
      const left = i === 0;
      ctx.save();
      ctx.translate(left ? b.x + bw * 0.42 : b.x + b.w - bw * 0.42, b.y + b.h * (left ? 0.2 : 0.78));
      ctx.rotate(left ? -0.12 : 0.1);
      bubble(ctx, bw, texts[ti++ % texts.length], !left);
      ctx.restore();
    }
  });
}

/** 제목 아래 영역 양옆에 붙이는 큰 스티커 */
export function footerStickers(ctx: C, cx: number, top: number, w: number, seed: number, big: boolean) {
  const r = rng(seed ^ 0x5151);
  const s = big ? 120 : 86;
  const y = top + (big ? 112 : 104);
  const left: Sticker[] = [(c, z) => blob(c, z, '#8EE3D0'), (c, z) => blob(c, z, '#C7B4FF'), (c, z) => cloud(c, z * 1.15)];
  const right: Sticker[] = [(c, z) => heart(c, z * 0.8), (c, z) => star(c, z * 0.8), (c, z) => flower(c, z * 0.8, '#FF9EC2', '#FFFFFF')];
  ctx.save();
  ctx.translate(cx - w / 2 + s * 0.45, y);
  ctx.rotate(-0.12);
  left[Math.floor(r() * left.length)](ctx, s);
  ctx.restore();
  ctx.save();
  ctx.translate(cx + w / 2 - s * 0.4, y - s * 0.1);
  ctx.rotate(0.2);
  right[Math.floor(r() * right.length)](ctx, s);
  ctx.restore();
  ctx.save();
  ctx.translate(cx + w / 2 - s * 0.95, y + s * 0.42);
  sparkle(ctx, s * 0.36, '#FFFFFF');
  ctx.restore();
}
