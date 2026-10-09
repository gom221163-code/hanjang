// 오늘의 기록 카드 그리기. 미리보기와 저장 이미지 모두 이 함수 하나로 그린다.

import type { Ratio, RecordItem, TemplateId } from '../types';
import { ensureFonts, F } from './fonts';
import {
  type Ctx,
  type PhotoSource,
  drawLines,
  drawPhoto,
  ellipsize,
  fitText,
  fmtDots,
  fmtKo,
  hashStr,
  paperGrain,
  parseDate,
} from './draw';

export const APP_NAME = '한 장';

export type RecordLike = Pick<RecordItem, 'date' | 'title' | 'text' | 'template' | 'ratio' | 'filter'>;

export function sizeOf(ratio: Ratio) {
  return { W: 1080, H: ratio === '9:16' ? 1920 : 1080 };
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export async function renderRecord(
  canvas: HTMLCanvasElement,
  rec: RecordLike,
  photos: PhotoSource[],
  opts: { original?: boolean } = {},
) {
  await ensureFonts(rec.title + rec.text);
  const { W, H } = sizeOf(rec.ratio);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);
  const retro = rec.filter.retro && !opts.original ? Math.max(0, Math.min(100, rec.filter.strength)) : 0;
  const ps = photos.slice(0, 4);
  const T: Record<TemplateId, typeof polaroid> = { polaroid, minimal, retro: retroT, note };
  await T[rec.template](ctx, W, H, rec, ps, retro);
}

function brand(ctx: Ctx, W: number, H: number, color: string, pad = 52) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `400 24px ${F.serif}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(APP_NAME, W - pad, H - 40);
  ctx.restore();
}

/** n장의 사진을 상자 안에 나누는 기본 격자 */
function grid(n: number, r: Rect, gap: number, wide: boolean, captionH = 0): Rect[] {
  const cell = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h: h - captionH });
  const { x, y, w, h } = r;
  if (n <= 1) return [cell(x, y, w, h)];
  if (n === 2) {
    return wide
      ? [cell(x, y, (w - gap) / 2, h), cell(x + (w + gap) / 2, y, (w - gap) / 2, h)]
      : [cell(x, y, w, (h - gap) / 2), cell(x, y + (h + gap) / 2, w, (h - gap) / 2)];
  }
  if (n === 3) {
    const top = wide ? h * 0.56 : h * 0.6;
    const bw = (w - gap) / 2;
    return [
      cell(x, y, w, top),
      cell(x, y + top + gap, bw, h - top - gap),
      cell(x + bw + gap, y + top + gap, bw, h - top - gap),
    ];
  }
  const bw = (w - gap) / 2;
  const bh = (h - gap) / 2;
  return [
    cell(x, y, bw, bh),
    cell(x + bw + gap, y, bw, bh),
    cell(x, y + bh + gap, bw, bh),
    cell(x + bw + gap, y + bh + gap, bw, bh),
  ];
}

// ======================= 1. 폴라로이드 다이어리 =======================

type Spot = [cx: number, cy: number, rot: number];
const POLA: Record<string, { p: number; spots: Spot[] }> = {
  '9:16-1': { p: 800, spots: [[0.5, 0.4, -2]] },
  '9:16-2': { p: 560, spots: [[0.38, 0.3, -4], [0.62, 0.62, 3.5]] },
  '9:16-3': { p: 470, spots: [[0.34, 0.27, -5], [0.67, 0.45, 4], [0.4, 0.66, -2]] },
  '9:16-4': { p: 420, spots: [[0.3, 0.25, -4], [0.71, 0.29, 3], [0.32, 0.58, 2.5], [0.69, 0.62, -3]] },
  '1:1-1': { p: 540, spots: [[0.35, 0.53, -3]] },
  '1:1-2': { p: 360, spots: [[0.24, 0.45, -4], [0.51, 0.6, 3]] },
  '1:1-3': { p: 300, spots: [[0.22, 0.36, -5], [0.52, 0.42, 4], [0.36, 0.73, -2]] },
  '1:1-4': { p: 280, spots: [[0.2, 0.33, -4], [0.51, 0.34, 3], [0.22, 0.74, 2], [0.52, 0.75, -3]] },
};

async function polaroid(ctx: Ctx, W: number, H: number, rec: RecordLike, ps: PhotoSource[], retro: number) {
  const ink = '#3B342D';
  ctx.fillStyle = '#E8E2D8';
  ctx.fillRect(0, 0, W, H);
  paperGrain(ctx, W, H, 0.28);

  const tall = rec.ratio === '9:16';
  ctx.fillStyle = ink;
  ctx.font = `400 ${tall ? 54 : 44}px ${F.pen}`;
  ctx.textAlign = 'left';
  ctx.fillText(fmtKo(rec.date), tall ? 84 : 64, tall ? 150 : 100);

  const n = Math.max(1, ps.length);
  const L = POLA[`${rec.ratio}-${n}`];
  const p = L.p;
  const b = p * 0.06;
  const fw = p + b * 2;
  const fh = p + b + b * 3.4;

  const order = ps.map((_, i) => i).slice(1).concat(ps.length ? [0] : []);
  for (const i of order) {
    const [cx, cy, rot] = L.spots[i];
    ctx.save();
    ctx.translate(cx * W, cy * H);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.shadowColor = 'rgba(45,35,25,0.28)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = '#FBFAF6';
    ctx.fillRect(-fw / 2, -fh / 2, fw, fh);
    ctx.shadowColor = 'transparent';
    await drawPhoto(ctx, ps[i], -fw / 2 + b, -fh / 2 + b, p, p, { retro });
    // 아래 여백에 손글씨
    const stripY = -fh / 2 + b + p;
    const stripH = fh - b - p;
    const caption = i === 0 ? rec.title : '';
    if (caption) {
      ctx.fillStyle = ink;
      const fs = Math.round(stripH * 0.46);
      ctx.font = `400 ${fs}px ${F.pen}`;
      ctx.textAlign = 'center';
      ctx.fillText(ellipsize(ctx, caption, p - 20), 0, stripY + stripH * 0.62);
    }
    // 마스킹 테이프
    const tr = ((hashStr(ps[i].id) % 100) / 100 - 0.5) * 12;
    ctx.rotate((tr * Math.PI) / 180);
    ctx.fillStyle = 'rgba(236,224,186,0.78)';
    ctx.fillRect(-p * 0.17, -fh / 2 - p * 0.035, p * 0.34, p * 0.08);
    ctx.restore();
  }

  // 본문 글
  if (rec.text.trim()) {
    ctx.fillStyle = ink;
    if (tall) {
      const last = L.spots[ps.length - 1] ?? L.spots[0];
      const top = Math.max(...L.spots.slice(0, n).map((s) => s[1] * H)) + fh / 2 + 70;
      void last;
      const avail = H - 110 - top;
      const maxLines = Math.max(1, Math.floor(avail / 70));
      const t = fitText(ctx, rec.text, (s) => `400 ${s}px ${F.pen}`, W - 180, maxLines, 58, 42);
      drawLines(ctx, t.lines, 90, top + t.size, t.size * 1.22);
    } else {
      const x = n === 1 ? 700 : 780;
      const t = fitText(ctx, rec.text, (s) => `400 ${s}px ${F.pen}`, W - x - 60, 9, 48, 34);
      drawLines(ctx, t.lines, x, 250, t.size * 1.25);
    }
  }
  brand(ctx, W, H, 'rgba(59,52,45,0.55)');
}

// ======================= 2. 미니멀 콜라주 =======================

async function minimal(ctx: Ctx, W: number, H: number, rec: RecordLike, ps: PhotoSource[], retro: number) {
  const ink = '#1C1C1B';
  const muted = '#8D8981';
  const tall = rec.ratio === '9:16';
  const M = tall ? 80 : 64;
  ctx.fillStyle = '#F7F6F3';
  ctx.fillRect(0, 0, W, H);

  // 날짜 + 사진 장수
  ctx.fillStyle = muted;
  ctx.font = `400 ${tall ? 26 : 22}px ${F.mono}`;
  ctx.textAlign = 'left';
  const dy = tall ? 140 : 96;
  ctx.fillText(fmtDots(rec.date), M, dy);
  ctx.textAlign = 'right';
  ctx.fillText(`${String(ps.length).padStart(2, '0')} / PHOTOS`, W - M, dy);
  ctx.fillStyle = 'rgba(28,28,27,0.18)';
  ctx.fillRect(M, dy + 22, W - M * 2, 1.5);

  // 제목
  let y = dy + 22;
  if (rec.title.trim()) {
    ctx.fillStyle = ink;
    const t = fitText(ctx, rec.title, (s) => `400 ${s}px ${F.serif}`, W - M * 2, tall ? 2 : 1, tall ? 66 : 50, 40);
    drawLines(ctx, t.lines, M, y + 30 + t.size, t.size * 1.25);
    y += 30 + t.size * 1.25 * t.lines.length;
  }

  // 본문 (아래)
  let textLines: string[] = [];
  let textSize = 0;
  if (rec.text.trim()) {
    const t = fitText(ctx, rec.text, (s) => `400 ${s}px ${F.sans}`, W - M * 2, tall ? 4 : 2, tall ? 32 : 28, 24);
    textLines = t.lines;
    textSize = t.size;
  }
  const textH = textLines.length ? textLines.length * textSize * 1.6 + 30 : 0;
  const bottom = H - (tall ? 120 : 92) - textH;

  const region: Rect = { x: M, y: y + 36, w: W - M * 2, h: bottom - (y + 36) };
  const rects = grid(Math.max(1, ps.length), region, 14, !tall);
  for (let i = 0; i < ps.length; i++) {
    const r = rects[i];
    await drawPhoto(ctx, ps[i], r.x, r.y, r.w, r.h, { retro });
  }
  if (textLines.length) {
    ctx.fillStyle = '#4A4844';
    ctx.font = `400 ${textSize}px ${F.sans}`;
    drawLines(ctx, textLines, M, bottom + 30 + textSize, textSize * 1.6);
  }
  brand(ctx, W, H, 'rgba(28,28,27,0.42)', M);
}

// ======================= 3. 레트로 아이폰 =======================

async function retroT(ctx: Ctx, W: number, H: number, rec: RecordLike, ps: PhotoSource[], retro: number) {
  const tall = rec.ratio === '9:16';
  const M = tall ? 72 : 60;
  ctx.fillStyle = '#D8D6D0';
  ctx.fillRect(0, 0, W, H);
  paperGrain(ctx, W, H, 0.12);

  // 상단 바: 옛날 폰 화면 느낌
  const barH = tall ? 112 : 84;
  ctx.fillStyle = '#2A2A2C';
  ctx.fillRect(0, 0, W, barH);
  ctx.fillStyle = '#E9E7E2';
  ctx.font = `500 ${tall ? 26 : 22}px ${F.mono}`;
  ctx.textAlign = 'left';
  const dt = parseDate(rec.date);
  const yy = String(dt.getFullYear()).slice(2);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  ctx.fillText(`ALBUM · ${mm}/${dd}/${dt.getFullYear()}`, M, barH / 2 + 9);
  ctx.textAlign = 'right';
  ctx.fillText(`${ps.length} PHOTO${ps.length > 1 ? 'S' : ''}`, W - M, barH / 2 + 9);

  // 본문 높이 먼저 계산
  ctx.font = `400 ${tall ? 48 : 40}px ${F.sans}`;
  const title = rec.title.trim();
  let textLines: string[] = [];
  let textSize = 0;
  if (rec.text.trim()) {
    const t = fitText(ctx, rec.text, (s) => `400 ${s}px ${F.sans}`, W - M * 2, tall ? 3 : 2, tall ? 30 : 26, 22);
    textLines = t.lines;
    textSize = t.size;
  }
  const titleH = title ? (tall ? 70 : 56) : 0;
  const textH = textLines.length ? textLines.length * textSize * 1.55 + 10 : 0;
  const bottom = H - (tall ? 120 : 104) - titleH - textH;

  const capH = tall ? 46 : 38;
  const region: Rect = { x: M, y: barH + (tall ? 64 : 44), w: W - M * 2, h: bottom - barH - (tall ? 64 : 44) };
  const rects = grid(Math.max(1, ps.length), region, tall ? 34 : 26, !tall, capH);
  for (let i = 0; i < ps.length; i++) {
    const r = rects[i];
    const bd = 10;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.22)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
    await drawPhoto(ctx, ps[i], r.x + bd, r.y + bd, r.w - bd * 2, r.h - bd * 2, { retro });
    // 파일 이름 캡션
    const num = 1000 + (hashStr(ps[i].id) % 8999);
    ctx.fillStyle = '#5B5954';
    ctx.font = `400 ${tall ? 22 : 19}px ${F.mono}`;
    ctx.textAlign = 'left';
    ctx.fillText(`IMG_${num}.JPG`, r.x + 2, r.y + r.h + capH * 0.66);
    // 첫 사진에 옛날 디카 날짜 각인
    if (i === 0) {
      const fs = Math.max(22, Math.min(40, r.w * 0.045));
      ctx.save();
      ctx.font = `500 ${fs}px ${F.mono}`;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FF9A3D';
      ctx.shadowColor = 'rgba(255,120,30,0.85)';
      ctx.shadowBlur = fs * 0.35;
      ctx.fillText(`'${yy} ${mm} ${dd}`, r.x + r.w - bd - fs * 0.7, r.y + r.h - bd - fs * 0.6);
      ctx.restore();
    }
  }

  let ty = bottom + (tall ? 20 : 14);
  if (title) {
    ctx.fillStyle = '#222';
    ctx.font = `400 ${tall ? 46 : 38}px ${F.sans}`;
    ctx.textAlign = 'left';
    ctx.fillText(ellipsize(ctx, title, W - M * 2), M, ty + (tall ? 46 : 38));
    ty += titleH;
  }
  if (textLines.length) {
    ctx.fillStyle = '#4C4A46';
    ctx.font = `400 ${textSize}px ${F.sans}`;
    drawLines(ctx, textLines, M, ty + textSize + 6, textSize * 1.55);
  }
  brand(ctx, W, H, 'rgba(40,40,40,0.45)', M);
}

// ======================= 4. 노트 한 장 =======================

async function note(ctx: Ctx, W: number, H: number, rec: RecordLike, ps: PhotoSource[], retro: number) {
  const tall = rec.ratio === '9:16';
  const ink = '#2C3A52';
  const lineGap = tall ? 62 : 52;
  const firstLine = tall ? 200 : 150;
  const marginX = tall ? 130 : 110;
  ctx.fillStyle = '#FBF8F1';
  ctx.fillRect(0, 0, W, H);
  paperGrain(ctx, W, H, 0.12);
  // 줄
  ctx.fillStyle = '#D3DCE7';
  for (let y = firstLine; y < H - 40; y += lineGap) ctx.fillRect(0, y, W, 2);
  // 빨간 여백 선
  ctx.fillStyle = '#E8ABA5';
  ctx.fillRect(marginX - 22, 0, 2.5, H);
  // 펀치 구멍
  ctx.fillStyle = '#E4DFD4';
  const holes = tall ? [0.18, 0.5, 0.82] : [0.25, 0.75];
  for (const hy of holes) {
    ctx.beginPath();
    ctx.arc(46, H * hy, tall ? 20 : 16, 0, Math.PI * 2);
    ctx.fill();
  }

  // 날짜 (오른쪽 위), 제목 (첫 줄)
  ctx.fillStyle = ink;
  ctx.font = `400 ${tall ? 50 : 42}px ${F.pen}`;
  ctx.textAlign = 'right';
  ctx.fillText(fmtKo(rec.date), W - 70, firstLine - lineGap - 14);
  ctx.textAlign = 'left';
  let lineIdx = 0;
  if (rec.title.trim()) {
    ctx.font = `400 ${tall ? 66 : 54}px ${F.pen}`;
    const t = ellipsize(ctx, rec.title, W - marginX - 70);
    ctx.fillText(t, marginX, firstLine + lineGap * 1 - 12);
    // 형광펜 밑줄
    const tw = ctx.measureText(t).width;
    ctx.fillStyle = 'rgba(255,214,120,0.45)';
    ctx.fillRect(marginX - 6, firstLine + lineGap - 34, tw + 12, 24);
    lineIdx = 2;
  } else lineIdx = 1;

  // 사진 영역
  const n = ps.length;
  const top = firstLine + lineGap * lineIdx + 20;
  const areaW = W - marginX - 60;
  const areaH = tall ? (n <= 2 ? 900 : 1040) : 560;
  const rects: Array<Rect & { rot: number }> = [];
  const cx = marginX + areaW / 2;
  if (n === 1) {
    const w = tall ? 720 : 470;
    const h = tall ? 860 : 520;
    rects.push({ x: cx - w / 2, y: top + 10, w, h, rot: -1.5 });
  } else if (n === 2) {
    const w = tall ? 400 : 330;
    const h = tall ? 520 : 400;
    rects.push({ x: cx - w - 16, y: top + 20, w, h, rot: -3 }, { x: cx + 16, y: top + (tall ? 120 : 70), w, h, rot: 2.5 });
  } else if (n === 3) {
    const w = tall ? 380 : 260;
    const h = tall ? 430 : 300;
    rects.push(
      { x: cx - w - 18, y: top + 10, w, h, rot: -2.5 },
      { x: cx + 18, y: top + 40, w, h, rot: 2 },
      tall
        ? { x: cx - 230, y: top + h + 90, w: 460, h: 380, rot: -1 }
        : { x: cx - w / 2, y: top + h + 40, w, h: 210, rot: -1 },
    );
  } else if (n >= 4) {
    const w = tall ? 370 : 270;
    const h = tall ? 420 : 240;
    const g = tall ? 70 : 30;
    rects.push(
      { x: cx - w - 18, y: top + 10, w, h, rot: -2.5 },
      { x: cx + 18, y: top + 34, w, h, rot: 2 },
      { x: cx - w - 10, y: top + h + g, w, h, rot: 1.5 },
      { x: cx + 26, y: top + h + g + 20, w, h, rot: -2 },
    );
  }
  for (let i = 0; i < n; i++) {
    const r = rects[i];
    const bd = 14;
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.rotate((r.rot * Math.PI) / 180);
    ctx.shadowColor = 'rgba(40,40,60,0.2)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-r.w / 2, -r.h / 2, r.w, r.h);
    ctx.shadowColor = 'transparent';
    await drawPhoto(ctx, ps[i], -r.w / 2 + bd, -r.h / 2 + bd, r.w - bd * 2, r.h - bd * 2, { retro });
    // 모서리 테이프
    ctx.fillStyle = 'rgba(200,215,235,0.75)';
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate((sx * r.w) / 2, -r.h / 2);
      ctx.rotate((sx * 40 * Math.PI) / 180);
      ctx.fillRect(-48, -16, 96, 32);
      ctx.restore();
    }
    ctx.restore();
  }

  // 본문을 줄 위에 쓴다
  if (rec.text.trim()) {
    const used = rects.length ? Math.max(...rects.map((r) => r.y + r.h)) + 30 : top;
    let k = Math.ceil((used - firstLine) / lineGap);
    k = Math.max(k, 0);
    const startY = firstLine + lineGap * (k + 1) - 12;
    const maxLines = Math.max(1, Math.floor((H - 90 - startY) / lineGap) + 1);
    ctx.fillStyle = ink;
    const t = fitText(ctx, rec.text, (s) => `400 ${s}px ${F.pen}`, W - marginX - 70, maxLines, tall ? 54 : 46, tall ? 44 : 38);
    ctx.font = `400 ${t.size}px ${F.pen}`;
    drawLines(ctx, t.lines, marginX, startY, lineGap);
  }
  void areaH;
  brand(ctx, W, H, 'rgba(44,58,82,0.5)');
}

export const TEMPLATES: { id: TemplateId; name: string; hint: string }[] = [
  { id: 'polaroid', name: '폴라로이드', hint: '손글씨 메모와 흩어진 사진' },
  { id: 'minimal', name: '미니멀', hint: '깔끔한 격자와 작은 날짜' },
  { id: 'retro', name: '레트로 폰', hint: '옛날 폰 사진 느낌, 날짜 각인' },
  { id: 'note', name: '노트 한 장', hint: '줄 노트에 붙인 사진' },
];
