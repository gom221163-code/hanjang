// 사진 불러오기: 파일 → 축소본 + 작은 사진 + 촬영일
// 원본 파일은 저장하지 않는다. 원본은 사용자의 사진첩에 그대로 있다.

import type { DraftPhoto } from '../types';
import { newId } from '../storage/db';

export const FULL_MAX = 2048;
export const THUMB_MAX = 720;

export class PhotoLoadError extends Error {}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new PhotoLoadError('decode'));
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new PhotoLoadError('encode'))),
      'image/jpeg',
      quality,
    );
  });
}

async function resizeTo(img: HTMLImageElement, max: number, quality: number) {
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;
  const scale = Math.min(1, max / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new PhotoLoadError('canvas');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await canvasToBlob(c, quality);
  // 메모리 해제
  c.width = c.height = 0;
  return { blob, w, h };
}

async function hashFile(file: File): Promise<string> {
  try {
    if (crypto?.subtle) {
      const buf = await file.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(digest).slice(0, 16))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    /* 아래로 */
  }
  return newId();
}

/** JPEG 파일에서 촬영일(DateTimeOriginal)을 읽는다. 없거나 못 읽으면 undefined */
export async function readTakenDate(file: File): Promise<string | undefined> {
  try {
    const buf = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
    if (buf.getUint16(0) !== 0xffd8) return undefined;
    let off = 2;
    while (off + 4 < buf.byteLength) {
      const marker = buf.getUint16(off);
      const len = buf.getUint16(off + 2);
      if (marker === 0xffe1 && buf.getUint32(off + 4) === 0x45786966) {
        return parseExifDate(buf, off + 10);
      }
      if ((marker & 0xff00) !== 0xff00) break;
      off += 2 + len;
    }
  } catch {
    /* 무시 */
  }
  return undefined;
}

function parseExifDate(v: DataView, tiff: number): string | undefined {
  const little = v.getUint16(tiff) === 0x4949;
  const u16 = (o: number) => v.getUint16(o, little);
  const u32 = (o: number) => v.getUint32(o, little);
  const readAscii = (o: number, n: number) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      const c = v.getUint8(o + i);
      if (!c) break;
      s += String.fromCharCode(c);
    }
    return s;
  };
  const findTag = (ifd: number, tag: number): number | undefined => {
    const n = u16(ifd);
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      if (u16(e) === tag) return e;
    }
    return undefined;
  };
  const ifd0 = tiff + u32(tiff + 4);
  const exifPtr = findTag(ifd0, 0x8769);
  let raw: string | undefined;
  if (exifPtr !== undefined) {
    const exifIfd = tiff + u32(exifPtr + 8);
    const dt = findTag(exifIfd, 0x9003);
    if (dt !== undefined) raw = readAscii(tiff + u32(dt + 8), 19);
  }
  if (!raw) {
    const dt = findTag(ifd0, 0x0132);
    if (dt !== undefined) raw = readAscii(tiff + u32(dt + 8), 19);
  }
  const m = raw?.match(/^(\d{4}):(\d{2}):(\d{2})/);
  if (!m || m[1] === '0000') return undefined;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * 파일 하나를 저장 가능한 사진으로 만든다.
 * 실패하면 PhotoLoadError를 던지며, 이미 저장된 데이터에는 영향이 없다.
 */
export async function prepareFile(file: File): Promise<DraftPhoto> {
  if (file.type && !file.type.startsWith('image/')) throw new PhotoLoadError('type');
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const [id, takenAt, full, thumb] = await Promise.all([
      hashFile(file),
      readTakenDate(file),
      resizeTo(img, FULL_MAX, 0.9),
      resizeTo(img, THUMB_MAX, 0.85),
    ]);
    return {
      id,
      full: full.blob,
      thumb: thumb.blob,
      width: full.w,
      height: full.h,
      takenAt,
      previewUrl: URL.createObjectURL(thumb.blob),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function photoErrorMessage(fileName: string, err: unknown): string {
  const kind = err instanceof PhotoLoadError ? err.message : 'unknown';
  if (kind === 'type') return `'${fileName}'은(는) 사진 파일이 아니에요.`;
  if (kind === 'decode')
    return `'${fileName}'을(를) 열 수 없어요. 이 브라우저가 지원하지 않는 형식(예: HEIC)일 수 있어요. 다른 사진을 골라 주세요.`;
  return `'${fileName}'을(를) 처리하지 못했어요. 사진이 너무 크거나 폰 메모리가 부족할 수 있어요.`;
}
