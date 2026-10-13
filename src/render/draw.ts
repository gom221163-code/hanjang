import type { Adjust } from '../types';
// 그리기 도우미: 사진 캐시, 꽉 채워 자르기, 레트로 필터, 글자 줄바꿈

export interface PhotoSource {
  id: string;
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
  takenAt?: string;
}

export type Ctx = CanvasRenderingContext2D;

// ---------- 사진 캐시 (메모리 보호를 위해 최근 것만 보관) ----------

const MAX_CACHE = 10;
const imgCache = new Map<string, Promise<HTMLImageElement>>();

export function loadPhoto(p: PhotoSource, size: 'full' | 'thumb'): Promise<HTMLImageElement> {
  const key = `${p.id}:${size}`;
  const hit = imgCache.get(key);
  if (hit) {
    imgCache.delete(key);
    imgCache.set(key, hit);
    return hit;
  }
  const blob = size === 'full' ? p.full : p.thumb;
  const pr = new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      imgCache.delete(key);
      reject(new Error('사진을 불러오지 못했어요'));
    };
    img.src = url;
  });
  imgCache.set(key, pr);
  while (imgCache.size > MAX_CACHE) {
    const first = imgCache.keys().next().value as string;
    imgCache.delete(first);
  }
  return pr;
}

export function clearPhotoCache() {
  imgCache.clear();
  filterCache.clear();
}

// ---------- 기본 도형 ----------

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** 사진을 상자에 꽉 차게(넘치는 부분은 잘라서) 그린다 */
export function drawCover(
  ctx: Ctx,
  img: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 0,
) {
  const iw = (img as HTMLImageElement).naturalWidth || img.width;
  const ih = (img as HTMLImageElement).naturalHeight || img.height;
  const s = Math.max(w / iw, h / ih);
  const sw = w / s;
  const sh = h / s;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  ctx.save();
  if (radius > 0) {
    roundRect(ctx, x, y, w, h, radius);
    ctx.clip();
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

// ---------- 레트로 필터 ----------
// 저장된 사진은 절대 바꾸지 않는다. 그릴 때마다 새 캔버스에 필터를 입혀서 쓴다.
// 실제 옛날 아이폰 카메라를 재현하는 것이 아니라, 그 느낌을 흉내 낸 효과다.

const filterCache = new Map<string, Promise<HTMLCanvasElement>>();

function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

function hashStr(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

export interface PhotoFx {
  retro?: number; // 0~100, 0이면 끔
  adjust?: Adjust;
}

export function isNeutral(a?: Adjust) {
  return !a || (!a.brightness && !a.contrast && !a.saturation && !a.warmth && !a.fade && !a.grain);
}

/**
 * 상자 크기(w,h)에 맞게 자른 뒤 색감 조절 → 레트로 순서로 효과를 입힌 캔버스를 돌려준다.
 * 저장된 사진은 건드리지 않고, 새 캔버스에만 그린다.
 */
export function processedCover(img: HTMLImageElement, photoId: string, w: number, h: number, fx: PhotoFx): Promise<HTMLCanvasElement> {
  w = Math.round(w);
  h = Math.round(h);
  const adj = isNeutral(fx.adjust) ? undefined : fx.adjust;
  const retro = fx.retro && fx.retro > 0 ? fx.retro : 0;
  const key = `${photoId}:${w}x${h}:${retro}:${adj ? JSON.stringify(adj) : '-'}`;
  const hit = filterCache.get(key);
  if (hit) return hit;
  const job = (async () => {
    let c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    drawCover(c.getContext('2d')!, img, 0, 0, w, h);
    if (adj) applyAdjust(c, photoId, adj);
    if (retro) {
      const r = await applyRetro(c, photoId, w, h, retro / 100);
      c.width = c.height = 0;
      c = r;
    }
    return c;
  })();
  filterCache.set(key, job);
  job.catch(() => filterCache.delete(key));
  while (filterCache.size > 16) filterCache.delete(filterCache.keys().next().value as string);
  return job;
}

/** 밝기·대비·채도·따뜻함·바랜 느낌·노이즈를 픽셀 단위로 적용한다 */
export function applyAdjust(c: HTMLCanvasElement, photoId: string, a: Adjust) {
  const w = c.width;
  const h = c.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const bright = a.brightness * 0.55;
  const contrast = 1 + (a.contrast / 100) * 0.6;
  const sat = 1 + a.saturation / 100;
  const warmR = a.warmth * 0.22;
  const warmG = a.warmth * 0.04;
  const warmB = -a.warmth * 0.24;
  const lift = a.fade * 0.6;
  const liftK = (255 - lift) / 255;
  const grain = a.grain * 0.45;
  const rand = seeded(hashStr(photoId) ^ 0x9e37);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] + bright;
    let g = d[i + 1] + bright;
    let b = d[i + 2] + bright;
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    r = l + (r - l) * sat + warmR;
    g = l + (g - l) * sat + warmG;
    b = l + (b - l) * sat + warmB;
    if (lift) {
      r = lift + Math.max(0, r) * liftK;
      g = lift + Math.max(0, g) * liftK;
      b = lift + Math.max(0, b) * liftK;
    }
    if (grain) {
      const n = (rand() - 0.5) * grain;
      r += n;
      g += n;
      b += n;
    }
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
  ctx.putImageData(img, 0, 0);
}

async function applyRetro(img: HTMLCanvasElement, photoId: string, w: number, h: number, s: number) {
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d', { willReadFrequently: true })!;

  // 1) 해상도를 낮췄다가 다시 키워서 디테일을 뭉갠다 (옛날 폰의 낮은 화소 느낌)
  const f = 1 - 0.62 * s;
  const sw = Math.max(16, Math.round(w * f));
  const sh = Math.max(16, Math.round(h * f));
  const small = document.createElement('canvas');
  small.width = sw;
  small.height = sh;
  drawCover(small.getContext('2d')!, img, 0, 0, sw, sh);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'low';
  ctx.drawImage(small, 0, 0, w, h);
  small.width = small.height = 0;

  // 2) 색감, 강한 샤프닝, 노이즈
  const src = ctx.getImageData(0, 0, w, h);
  const d = src.data;
  const copy = new Uint8ClampedArray(d);
  const rand = seeded(hashStr(photoId));
  const sharpen = 1.1 * s;
  const noise = 26 * s;
  const sat = 1 - 0.22 * s;
  const W4 = w * 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * W4 + x * 4;
      let r = copy[i];
      let g = copy[i + 1];
      let b = copy[i + 2];
      // 샤프닝 (주변 4칸 평균과의 차이를 키운다)
      if (x > 0 && y > 0 && x < w - 1 && y < h - 1) {
        for (let c = 0; c < 3; c++) {
          const v = copy[i + c];
          const avg = (copy[i + c - 4] + copy[i + c + 4] + copy[i + c - W4] + copy[i + c + W4]) / 4;
          const nv = v + (v - avg) * sharpen;
          if (c === 0) r = nv;
          else if (c === 1) g = nv;
          else b = nv;
        }
      }
      // 채도 낮추기
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      r = l + (r - l) * sat;
      g = l + (g - l) * sat;
      b = l + (b - l) * sat;
      // 어두운 곳은 살짝 들뜨고 초록빛, 밝은 곳은 따뜻하게
      const t = l / 255;
      r += (1 - t) * 14 * s + t * 12 * s;
      g += (1 - t) * 16 * s + t * 4 * s;
      b += (1 - t) * 10 * s - t * 16 * s;
      // 대비 살짝 높이기
      r = (r - 128) * (1 + 0.08 * s) + 128;
      g = (g - 128) * (1 + 0.08 * s) + 128;
      b = (b - 128) * (1 + 0.08 * s) + 128;
      // 노이즈 (밝기 + 약간의 색 노이즈)
      const n = (rand() - 0.5) * noise;
      d[i] = r + n + (rand() - 0.5) * noise * 0.35;
      d[i + 1] = g + n;
      d[i + 2] = b + n + (rand() - 0.5) * noise * 0.35;
    }
  }
  ctx.putImageData(src, 0, 0);

  // 3) 가장자리를 살짝 어둡게
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) / 1.9);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(20,15,10,${0.32 * s})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 4) JPEG로 한 번 더 압축해서 특유의 뭉개짐을 만든다
  if (s > 0.05) {
    const blob = await new Promise<Blob | null>((r) => out.toBlob(r, 'image/jpeg', Math.max(0.35, 0.9 - 0.5 * s)));
    if (blob) {
      const url = URL.createObjectURL(blob);
      try {
        const im = new Image();
        im.src = url;
        await im.decode();
        ctx.drawImage(im, 0, 0, w, h);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  }
  return out;
}

/** 효과(색감 조절, 레트로) 여부에 따라 사진을 그린다 */
export async function drawPhoto(
  ctx: Ctx,
  p: PhotoSource,
  x: number,
  y: number,
  w: number,
  h: number,
  opt: { size?: 'full' | 'thumb'; radius?: number } & PhotoFx = {},
) {
  const img = await loadPhoto(p, opt.size ?? 'full');
  if ((opt.retro && opt.retro > 0) || !isNeutral(opt.adjust)) {
    const c = await processedCover(img, p.id, w, h, opt);
    ctx.save();
    if (opt.radius) {
      roundRect(ctx, x, y, w, h, opt.radius);
      ctx.clip();
    }
    ctx.drawImage(c, x, y, w, h);
    ctx.restore();
  } else {
    drawCover(ctx, img, x, y, w, h, opt.radius ?? 0);
  }
}

// ---------- 글자 ----------

/** 한글은 글자 단위로, 영어는 띄어쓰기 단위로 줄을 나눈다 */
export function wrapLines(ctx: Ctx, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.replace(/\r/g, '').split('\n')) {
    if (!para.trim()) {
      out.push('');
      continue;
    }
    const tokens = para.match(/[A-Za-z0-9'’.,!?@#&%:;()\-_/]+|\s+|./gu) ?? [];
    let line = '';
    for (const tok of tokens) {
      const test = line + tok;
      if (ctx.measureText(test).width <= maxW || !line) {
        // 한 토큰이 한 줄보다 길면 글자 단위로 쪼갠다
        if (ctx.measureText(test).width > maxW && !line) {
          for (const ch of tok) {
            if (ctx.measureText(line + ch).width > maxW && line) {
              out.push(line);
              line = ch;
            } else line += ch;
          }
        } else line = test;
      } else {
        out.push(line.trimEnd());
        line = tok.trimStart();
      }
    }
    if (line) out.push(line.trimEnd());
  }
  return out;
}

/**
 * 상자에 맞게 글자 크기를 줄여 가며 줄바꿈한다.
 * 최소 크기에서도 넘치면 마지막 줄을 …로 줄인다.
 */
export function fitText(
  ctx: Ctx,
  text: string,
  font: (size: number) => string,
  maxW: number,
  maxLines: number,
  start: number,
  min: number,
): { size: number; lines: string[] } {
  let size = start;
  let lines: string[] = [];
  while (size >= min) {
    ctx.font = font(size);
    lines = wrapLines(ctx, text, maxW);
    if (lines.length <= maxLines) return { size, lines };
    size -= 2;
  }
  size = min;
  ctx.font = font(size);
  lines = wrapLines(ctx, text, maxW).slice(0, maxLines);
  let last = lines[lines.length - 1] ?? '';
  while (last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
  lines[lines.length - 1] = last + '…';
  return { size, lines };
}

export function drawLines(
  ctx: Ctx,
  lines: string[],
  x: number,
  y: number,
  lineH: number,
  align: CanvasTextAlign = 'left',
) {
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
}

/** 한 줄로 자르기 */
export function ellipsize(ctx: Ctx, text: string, maxW: number) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

// ---------- 종이 질감 ----------

let grain: HTMLCanvasElement | null = null;
export function paperGrain(ctx: Ctx, w: number, h: number, alpha: number) {
  if (!grain) {
    grain = document.createElement('canvas');
    grain.width = grain.height = 256;
    const g = grain.getContext('2d')!;
    const id = g.createImageData(256, 256);
    const rand = seeded(7);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = 128 + (rand() - 0.5) * 90;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  const pat = ctx.createPattern(grain, 'repeat');
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

// ---------- 날짜 ----------

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const WEEK_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const MONTH_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

export function parseDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}
export function fmtKo(d: string) {
  const dt = parseDate(d);
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일 ${WEEK[dt.getDay()]}요일`;
}
export function fmtDots(d: string) {
  const dt = parseDate(d);
  return `${d.replace(/-/g, '.')} ${WEEK_EN[dt.getDay()]}`;
}
export function fmtShort(d: string) {
  const dt = parseDate(d);
  return `${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')} ${WEEK[dt.getDay()]}`;
}
export { hashStr };
