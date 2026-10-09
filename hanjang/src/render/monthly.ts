// 한 달 한 장 포토 다이어리 그리기 (9:16, 1080×1920)
// 기록 수에 정확히 맞는 배치를 써서 빈칸이나 사진 중복이 생기지 않게 한다.

import type { RecordItem } from '../types';
import { ensureFonts, F } from './fonts';
import { APP_NAME } from './record';
import {
  type Ctx,
  type PhotoSource,
  MONTH_EN,
  drawLines,
  drawPhoto,
  ellipsize,
  fitText,
  fmtShort,
  paperGrain,
} from './draw';

export const MONTHLY_MAX = 9;
export const MW = 1080;
export const MH = 1920;

export interface MonthlyInput {
  month: string; // YYYY-MM
  title: string;
  variant: number;
  records: RecordItem[]; // 표시 순서대로 (첫 번째가 대표)
  photoOf: (r: RecordItem) => PhotoSource | undefined; // 기록의 대표 사진
  retroOf?: (r: RecordItem) => number;
}

const PAPER = '#F1EEE8';
const INK = '#26231F';
const SOFT = '#7C756B';
const RULE = 'rgba(38,35,31,0.22)';

interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
  cap: 'full' | 'title' | 'date' | 'none';
}

export async function renderMonthly(canvas: HTMLCanvasElement, m: MonthlyInput) {
  await ensureFonts(m.title + m.records.map((r) => r.title + r.text).join(''));
  canvas.width = MW;
  canvas.height = MH;
  const ctx = canvas.getContext('2d')!;
  let recs = m.records.slice(0, MONTHLY_MAX);
  const n = recs.length;
  const dark = n >= 7;
  if (dark) recs = recs.slice().sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, MW, MH);
  paperGrain(ctx, MW, MH, 0.22);

  const M = 72;
  const headerBottom = drawHeader(ctx, m, n, M);

  if (n === 0) {
    ctx.fillStyle = SOFT;
    ctx.font = `400 40px ${F.serif}`;
    ctx.textAlign = 'center';
    ctx.fillText('아직 이달의 기록이 없어요', MW / 2, MH / 2 + 40);
    footer(ctx, M, n);
    return;
  }

  const region = { x: M, y: headerBottom + 56, w: MW - M * 2, h: MH - 150 - (headerBottom + 56) };
  let slots = layout(n, region);
  if (m.variant % 2 === 1 && n >= 2 && n <= 6) slots = slots.map((s) => ({ ...s, x: MW - s.x - s.w }));

  if (dark) {
    // 밀착 인화지: 어두운 판 위에 필름 칸
    const top = Math.min(...slots.map((s) => s.y)) - 40;
    const bottom = Math.max(...slots.map((s) => s.y + s.h)) + 76;
    ctx.fillStyle = '#262320';
    ctx.fillRect(0, top, MW, bottom - top);
    // 필름 구멍
    ctx.fillStyle = PAPER;
    for (let x = 30; x < MW; x += 54) {
      ctx.fillRect(x, top + 12, 26, 14);
      ctx.fillRect(x, bottom - 26, 26, 14);
    }
  }

  for (let i = 0; i < n; i++) {
    const r = recs[i];
    const s = slots[i];
    const p = m.photoOf(r);
    const big = s.w > 500;
    if (p) {
      await drawPhoto(ctx, p, s.x, s.y, s.w, s.h, { size: big ? 'full' : 'thumb', retro: m.retroOf?.(r) ?? 0 });
    } else {
      ctx.fillStyle = dark ? '#3A3632' : '#E2DDD4';
      ctx.fillRect(s.x, s.y, s.w, s.h);
    }
    caption(ctx, r, s, dark, n);
  }
  footer(ctx, M, n);
}

function drawHeader(ctx: Ctx, m: MonthlyInput, n: number, M: number): number {
  const [y, mo] = m.month.split('-').map(Number);
  const big = n <= 2 ? 330 : n <= 6 ? 270 : 210;
  const top = 70;
  ctx.fillStyle = INK;
  ctx.font = `italic 500 ${big}px ${F.display}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const numStr = String(mo).padStart(2, '0');
  const base = top + big * 0.8;
  ctx.fillText(numStr, M - 8, base);
  const numW = ctx.measureText(numStr).width;

  // 오른쪽: 월 이름, 연도, 기록 수
  const rx = M + numW + 36;
  const rw = MW - M - rx;
  ctx.font = `500 ${n <= 2 ? 30 : 26}px ${F.mono}`;
  ctx.fillStyle = INK;
  ctx.fillText(MONTH_EN[mo - 1].split('').join(' '), rx, base - big * 0.48);
  ctx.fillStyle = SOFT;
  ctx.font = `400 ${n <= 2 ? 26 : 22}px ${F.mono}`;
  ctx.fillText(`${y}`, rx, base - big * 0.48 + 44);
  ctx.fillText(`이달의 기록 ${n}개`, rx, base - big * 0.48 + 82);
  void rw;

  // 제목
  let bottom = base + 26;
  ctx.fillStyle = RULE;
  ctx.fillRect(M, bottom, MW - M * 2, 1.5);
  const title = m.title.trim();
  if (title) {
    ctx.fillStyle = INK;
    const t = fitText(ctx, title, (s) => `400 ${s}px ${F.serif}`, MW - M * 2, n <= 2 ? 2 : 1, n <= 2 ? 58 : 48, 34);
    drawLines(ctx, t.lines, M, bottom + 30 + t.size, t.size * 1.3);
    bottom += 30 + t.size * 1.3 * t.lines.length;
  }
  return bottom;
}

function footer(ctx: Ctx, M: number, n: number) {
  ctx.fillStyle = RULE;
  ctx.fillRect(M, MH - 104, MW - M * 2, 1.5);
  ctx.font = `400 22px ${F.mono}`;
  ctx.fillStyle = SOFT;
  ctx.textAlign = 'left';
  ctx.fillText(`${String(n).padStart(2, '0')} MOMENTS KEPT`, M, MH - 62);
  ctx.font = `400 24px ${F.serif}`;
  ctx.textAlign = 'right';
  ctx.fillText(APP_NAME, MW - M, MH - 62);
}

/** 기록 수별 배치. 첫 번째 칸이 대표(가장 큼). */
function layout(n: number, r: { x: number; y: number; w: number; h: number }): Slot[] {
  const { x, y, w, h } = r;
  const g = 28;
  if (n === 1) {
    const ph = Math.min(h - 300, w * 1.3);
    return [{ x, y, w, h: ph, cap: 'full' }];
  }
  if (n === 2) {
    // 엇갈린 두 장: 각자 날짜·제목·짧은 글
    const pw = w * 0.64;
    const ph = (h - 330) / 2;
    return [
      { x, y, w: pw, h: ph, cap: 'full' },
      { x: x + w - pw, y: y + ph + 165, w: pw, h: ph, cap: 'full' },
    ];
  }
  if (n === 3) {
    const topH = h * 0.5;
    const bw = (w - g) / 2;
    const bh = h - topH - 110 - 110;
    return [
      { x, y, w, h: topH, cap: 'title' },
      { x, y: y + topH + 110, w: bw, h: bh, cap: 'title' },
      { x: x + bw + g, y: y + topH + 110, w: bw, h: bh, cap: 'title' },
    ];
  }
  if (n === 4) {
    // 큰 사진 1 + 오른쪽 세로 3
    const lw = w * 0.62;
    const rw = w - lw - g;
    const rh = (h - 80 - g * 2 - 60 * 2) / 3;
    const lh = h - 80;
    return [
      { x, y, w: lw, h: lh, cap: 'title' },
      { x: x + lw + g, y, w: rw, h: rh, cap: 'date' },
      { x: x + lw + g, y: y + rh + 60 + g, w: rw, h: rh, cap: 'date' },
      { x: x + lw + g, y: y + (rh + 60 + g) * 2, w: rw, h: rh, cap: 'date' },
    ];
  }
  if (n === 5 || n === 6) {
    // 위: 큰 사진 + 작은 세로 2장 / 아래: 2장 또는 3장
    const capS = 60;
    const lw = w * 0.6;
    const rw = w - lw - g;
    const topH = h * 0.56;
    const rh = (topH - g - capS) / 2;
    const top: Slot[] = [
      { x, y, w: lw, h: topH - 90, cap: 'title' },
      { x: x + lw + g, y, w: rw, h: rh, cap: 'date' },
      { x: x + lw + g, y: y + rh + capS + g, w: rw, h: rh - 30, cap: 'date' },
    ];
    const by = y + topH + 30;
    const bh = h - topH - 30 - capS;
    const k = n - 3;
    const bw = (w - g * (k - 1)) / k;
    const bottom: Slot[] = Array.from({ length: k }, (_, i) => ({ x: x + i * (bw + g), y: by, w: bw, h: bh, cap: 'date' as const }));
    return [...top, ...bottom];
  }
  // 7~9: 밀착 인화지 3열. 마지막 줄이 덜 차면 가운데 정렬 (빈칸 없음)
  const cols = 3;
  const rows = Math.ceil(n / cols);
  const cw = (w - g * (cols - 1)) / cols;
  const capH = 56;
  const ch = Math.min(cw * 1.25, (h - 80 - rows * capH - (rows - 1) * g) / rows);
  const out: Slot[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, n - row * cols);
    const rowW = inRow * cw + (inRow - 1) * g;
    const startX = x + (w - rowW) / 2;
    const col = i % cols;
    out.push({ x: startX + col * (cw + g), y: y + 30 + row * (ch + capH + g), w: cw, h: ch, cap: 'date' });
  }
  return out;
}

function caption(ctx: Ctx, r: { date: string; title: string; text: string }, s: Slot, dark: boolean, n: number) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const x = s.x;
  let y = s.y + s.h;
  if (s.cap === 'none') return;
  if (dark) {
    // 필름 칸 번호처럼: 날짜 숫자 강조
    const day = r.date.slice(8, 10);
    ctx.fillStyle = '#F1EEE8';
    ctx.font = `500 30px ${F.mono}`;
    ctx.fillText(day, x, y + 40);
    const dw = ctx.measureText(day).width;
    ctx.fillStyle = '#A59E93';
    ctx.font = `400 22px ${F.sans}`;
    if (r.title) ctx.fillText(ellipsize(ctx, r.title, s.w - dw - 16), x + dw + 14, y + 39);
    return;
  }
  ctx.fillStyle = SOFT;
  ctx.font = `400 ${s.cap === 'date' ? 20 : 22}px ${F.mono}`;
  ctx.fillText(fmtShort(r.date), x, y + 38);
  if (s.cap === 'date') {
    if (r.title && s.w > 250) {
      const dw = ctx.measureText(fmtShort(r.date)).width;
      ctx.fillStyle = INK;
      ctx.font = `400 22px ${F.serif}`;
      ctx.fillText(ellipsize(ctx, r.title, s.w - dw - 16), x + dw + 14, y + 38);
    }
    return;
  }
  y += 38;
  if (r.title) {
    ctx.fillStyle = INK;
    ctx.font = `400 ${n <= 2 ? 40 : 30}px ${F.serif}`;
    ctx.fillText(ellipsize(ctx, r.title, s.w), x, y + (n <= 2 ? 56 : 44));
    y += n <= 2 ? 56 : 44;
  }
  if (s.cap === 'full' && r.text.trim()) {
    ctx.fillStyle = '#4A453E';
    const maxLines = n === 1 ? 5 : 2;
    const t = fitText(ctx, r.text, (sz) => `400 ${sz}px ${F.sans}`, s.w, maxLines, n === 1 ? 32 : 27, 22);
    drawLines(ctx, t.lines, x, y + 18 + t.size, t.size * 1.6);
  }
}
