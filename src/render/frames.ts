// 네컷 프레임 세트
// 새 세트를 추가하려면 FRAME_SETS에 항목 하나만 넣으면 된다.
// paid: true 인 세트는 나중에 결제 기능을 붙일 때 잠금 처리할 수 있다. (지금은 모두 무료)
// 무늬는 모두 이 앱에서 직접 그린 오리지널 디자인이다.

import { heart, scatterDoodles, star } from './doodle';

export type Deco = 'snow' | 'plaid' | 'flakes' | 'stars' | 'confetti' | 'sparkle';

export type FrameStyle = 'plain' | 'doodle' | 'booth';

export interface FrameDef {
  id: string;
  style?: FrameStyle; // 배치와 꾸밈 방식 (기본 plain)
  grid?: boolean; // 낙서: 모눈종이 바탕
  name: string;
  bg: string;
  ink: string; // 제목 색
  sub: string; // 날짜·앱 이름 색
  accent?: string; // 무늬·문구 색
  deco?: Deco;
  tag?: (year: number) => string; // 아래에 들어가는 시즌 문구
}

export interface FrameSet {
  id: string;
  name: string;
  paid: boolean;
  isNew?: boolean;
  frames: FrameDef[];
}

export const FRAME_SETS: FrameSet[] = [
  {
    id: 'basic',
    name: '기본',
    paid: false,
    frames: [
      { id: 'white', name: '화이트', bg: '#FFFFFF', ink: '#232323', sub: '#8A8A8A' },
      { id: 'black', name: '블랙', bg: '#191919', ink: '#F3F3F3', sub: '#9A9A9A' },
      { id: 'cream', name: '크림', bg: '#F2EADB', ink: '#4A3F32', sub: '#93856F' },
      { id: 'pink', name: '핑크', bg: '#F1D3D6', ink: '#5B3940', sub: '#A07780' },
      { id: 'sky', name: '하늘', bg: '#CEDFEE', ink: '#2E4458', sub: '#6E8499' },
      { id: 'mint', name: '민트', bg: '#D2E7DA', ink: '#2E4A3B', sub: '#6B8C79' },
      { id: 'lavender', name: '라벤더', bg: '#DFD7EE', ink: '#423957', sub: '#857BA0' },
    ],
  },
  {
    id: 'doodle',
    name: '낙서',
    paid: false,
    isNew: true,
    frames: [
      { id: 'doodle-pink', name: '딸기우유', style: 'doodle', bg: '#F8C4C8', ink: '#3A2A2E', sub: '#8E5E66', accent: '#E0476A' },
      { id: 'doodle-mint', name: '소다', style: 'doodle', bg: '#BDE9E0', ink: '#22403A', sub: '#4F7F75', accent: '#2E8C7A' },
      { id: 'doodle-butter', name: '버터', style: 'doodle', bg: '#FBE6A2', ink: '#4A3A14', sub: '#8F7A3E', accent: '#E07A2E' },
      { id: 'doodle-note', name: '모눈 노트', style: 'doodle', grid: true, bg: '#FFFFFF', ink: '#262224', sub: '#7D7D86', accent: '#E0476A' },
    ],
  },
  {
    id: 'booth',
    name: '포토부스',
    paid: false,
    isNew: true,
    frames: [
      { id: 'booth-white', name: '화이트', style: 'booth', bg: '#FFFFFF', ink: '#111111', sub: '#6B6B6B' },
      { id: 'booth-black', name: '블랙', style: 'booth', bg: '#111111', ink: '#F5F5F5', sub: '#9A9A9A' },
      { id: 'booth-gray', name: '그레이', style: 'booth', bg: '#DADADA', ink: '#1B1B1B', sub: '#5E5E5E' },
      { id: 'booth-rose', name: '로즈', style: 'booth', bg: '#F3D8DE', ink: '#4A2833', sub: '#8C6370' },
    ],
  },
  {
    id: 'xmas',
    name: '크리스마스',
    paid: false,
    isNew: true,
    frames: [
      { id: 'xmas-snow', name: '눈 오는 밤', bg: '#1F3A2E', ink: '#F6F2E8', sub: '#A9C2B4', accent: '#E8C26A', deco: 'snow', tag: () => 'Merry Christmas' },
      { id: 'xmas-plaid', name: '체크 리본', bg: '#A82E2C', ink: '#FFF6EA', sub: '#F0C9B8', accent: '#F3E3C3', deco: 'plaid', tag: () => 'Merry Christmas' },
      { id: 'xmas-flakes', name: '하얀 겨울', bg: '#F8F7F2', ink: '#2A2A2A', sub: '#8E8C86', accent: '#C23B32', deco: 'flakes', tag: () => 'Merry Christmas' },
    ],
  },
  {
    id: 'yearend',
    name: '연말',
    paid: false,
    isNew: true,
    frames: [
      { id: 'ye-gold', name: '반짝 연말', bg: '#1C2340', ink: '#F4EBD0', sub: '#9EA6C4', accent: '#D9B45A', deco: 'stars', tag: (y) => `Goodbye ${y}` },
      { id: 'ye-cheers', name: '샴페인', bg: '#EFE3CC', ink: '#4D3B22', sub: '#9C8460', accent: '#B88A3E', deco: 'confetti', tag: () => 'Cheers!' },
      { id: 'ye-midnight', name: '자정', bg: '#141414', ink: '#F2F2F2', sub: '#8C8C8C', accent: '#CFD6DE', deco: 'sparkle', tag: (y) => `Hello ${y + 1}` },
    ],
  },
];

export const FRAMES: FrameDef[] = FRAME_SETS.flatMap((s) => s.frames);

export function frameOf(id?: string): FrameDef {
  return FRAMES.find((f) => f.id === id) ?? FRAMES[0];
}

export function setOf(frameId?: string): FrameSet {
  return FRAME_SETS.find((s) => s.frames.some((f) => f.id === frameId)) ?? FRAME_SETS[0];
}

// ---------------- 무늬 그리기 ----------------

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** 프레임 배경과 무늬를 그린다. 사진은 이 위에 그려진다. */
export function drawFrameBg(ctx: CanvasRenderingContext2D, W: number, H: number, f: FrameDef, scale?: number) {
  ctx.fillStyle = f.bg;
  ctx.fillRect(0, 0, W, H);
  if (!f.deco) return;
  const k = scale ?? W / 1080; // 무늬 크기 기준
  const area = (W * H) / (1080 * 1920) / (k * k); // 같은 밀도 유지
  const r = rng(f.id.length * 7919 + f.id.charCodeAt(0));
  const accent = f.accent ?? f.ink;
  ctx.save();
  switch (f.deco) {
    case 'snow': {
      const n = Math.round(420 * area);
      for (let i = 0; i < n; i++) {
        const rad = (2 + r() * r() * 9) * k;
        ctx.globalAlpha = 0.35 + r() * 0.5;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(r() * W, r() * H, Math.max(0.6, rad), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'plaid': {
      const step = 120 * k;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#5E1414';
      for (let x = -step; x < W + step; x += step) ctx.fillRect(x, 0, step * 0.42, H);
      for (let y = -step; y < H + step; y += step) ctx.fillRect(0, y, W, step * 0.42);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#1F4A33';
      for (let x = step * 0.62; x < W; x += step) ctx.fillRect(x, 0, 5 * k, H);
      for (let y = step * 0.62; y < H; y += step) ctx.fillRect(0, y, W, 5 * k);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#FFF2DA';
      for (let x = step * 0.84; x < W; x += step) ctx.fillRect(x, 0, 2 * k, H);
      for (let y = step * 0.84; y < H; y += step) ctx.fillRect(0, y, W, 2 * k);
      break;
    }
    case 'flakes': {
      const n = Math.round(130 * area);
      for (let i = 0; i < n; i++) {
        const x = r() * W;
        const y = r() * H;
        if (r() < 0.22) {
          // 빨간 열매
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = accent;
          const s = (4 + r() * 4) * k;
          ctx.beginPath();
          ctx.arc(x, y, s, 0, Math.PI * 2);
          ctx.arc(x + s * 1.8, y + s * 0.4, s * 0.9, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        const size = (12 + r() * 18) * k;
        ctx.globalAlpha = 0.55 + r() * 0.35;
        ctx.strokeStyle = '#9DB7CF';
        ctx.lineWidth = Math.max(1, 2 * k);
        ctx.lineCap = 'round';
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(r() * Math.PI);
        for (let a = 0; a < 6; a++) {
          ctx.rotate(Math.PI / 3);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -size);
          ctx.moveTo(0, -size * 0.55);
          ctx.lineTo(size * 0.22, -size * 0.75);
          ctx.moveTo(0, -size * 0.55);
          ctx.lineTo(-size * 0.22, -size * 0.75);
          ctx.stroke();
        }
        ctx.restore();
      }
      break;
    }
    case 'stars':
    case 'sparkle': {
      const n = Math.round((f.deco === 'stars' ? 140 : 170) * area);
      for (let i = 0; i < n; i++) {
        const x = r() * W;
        const y = r() * H;
        if (r() < 0.55) {
          ctx.globalAlpha = 0.3 + r() * 0.5;
          ctx.fillStyle = accent;
          ctx.beginPath();
          ctx.arc(x, y, (1 + r() * 2.2) * k, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        // 네 갈래 반짝이
        const s = (8 + r() * r() * 26) * k;
        ctx.globalAlpha = 0.55 + r() * 0.45;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(x, y - s);
        ctx.quadraticCurveTo(x, y, x + s, y);
        ctx.quadraticCurveTo(x, y, x, y + s);
        ctx.quadraticCurveTo(x, y, x - s, y);
        ctx.quadraticCurveTo(x, y, x, y - s);
        ctx.fill();
      }
      break;
    }
    case 'confetti': {
      const colors = [accent, '#E7A9A0', '#F4F0E6', '#C9B27A'];
      const n = Math.round(240 * area);
      for (let i = 0; i < n; i++) {
        ctx.save();
        ctx.translate(r() * W, r() * H);
        ctx.rotate(r() * Math.PI);
        ctx.globalAlpha = 0.55 + r() * 0.4;
        ctx.fillStyle = colors[Math.floor(r() * colors.length)];
        if (r() < 0.3) {
          ctx.beginPath();
          ctx.arc(0, 0, (2.5 + r() * 3) * k, 0, Math.PI * 2);
          ctx.fill();
        } else ctx.fillRect(-7 * k, -2.5 * k, (10 + r() * 8) * k, 5 * k);
        ctx.restore();
      }
      break;
    }
  }
  ctx.restore();
}

/** 고르기 화면용 작은 미리보기 (실제 무늬 그대로) */
const swatchCache = new Map<string, string>();
export function frameSwatch(f: FrameDef, size = 88): string {
  const hit = swatchCache.get(f.id);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  // 큰 화면에서 일부를 잘라 본 것처럼 보이도록 확대해서 그린다
  const crop = 260;
  ctx.save();
  ctx.scale(size / crop, size / crop);
  if (f.style === 'doodle') {
    ctx.fillStyle = f.bg;
    ctx.fillRect(0, 0, crop, crop);
    scatterDoodles(ctx, crop, crop, 7, 1.6, !!f.grid);
    ctx.save();
    ctx.translate(crop * 0.36, crop * 0.42);
    heart(ctx, 92);
    ctx.restore();
    ctx.save();
    ctx.translate(crop * 0.68, crop * 0.64);
    ctx.rotate(0.2);
    star(ctx, 84);
    ctx.restore();
  } else if (f.style === 'booth') {
    ctx.fillStyle = f.bg;
    ctx.fillRect(0, 0, crop, crop);
    ctx.fillStyle = f.ink === '#F5F5F5' ? '#3A3A3A' : 'rgba(0,0,0,0.14)';
    ctx.fillRect(crop * 0.2, crop * 0.36, crop * 0.6, crop * 0.64);
    ctx.strokeStyle = f.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(crop / 2, crop * 0.18, crop * 0.2, crop * 0.07, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else drawFrameBg(ctx, crop, crop, f, 1);
  ctx.restore();
  const url = c.toDataURL('image/png');
  swatchCache.set(f.id, url);
  return url;
}
