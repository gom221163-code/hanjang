// 저장 계층. 화면(UI)은 이 파일의 함수만 사용한다.
// 나중에 서버 저장으로 바꿀 때 이 파일만 교체하면 된다.
//
// 데이터가 깨지지 않게 하는 원칙
// 1. 사진 축소는 저장 전에 모두 끝낸다. 하나라도 실패하면 아무것도 쓰지 않는다.
// 2. 사진과 기록은 한 번의 트랜잭션으로 쓴다. 중간에 실패하면 전부 취소되어 기존 데이터가 그대로 남는다.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { MonthlyItem, RecordItem, StoredPhoto, DraftPhoto } from '../types';
import { toStorageError } from './errors';

interface HanjangDB extends DBSchema {
  photos: { key: string; value: StoredPhoto };
  records: { key: string; value: RecordItem; indexes: { byDate: string } };
  monthlies: { key: string; value: MonthlyItem };
}

let dbPromise: Promise<IDBPDatabase<HanjangDB>> | null = null;

function db() {
  if (!dbPromise) {
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(toStorageError(new Error('indexedDB unavailable')));
    }
    dbPromise = openDB<HanjangDB>('hanjang', 1, {
      upgrade(d) {
        d.createObjectStore('photos', { keyPath: 'id' });
        const r = d.createObjectStore('records', { keyPath: 'id' });
        r.createIndex('byDate', 'date');
        d.createObjectStore('monthlies', { keyPath: 'month' });
      },
    }).catch((e) => {
      dbPromise = null;
      throw toStorageError(e);
    });
  }
  return dbPromise;
}

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw toStorageError(e);
  }
}

export function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------- 기록 ----------

export async function listRecords(): Promise<RecordItem[]> {
  return guard(async () => {
    const all = await (await db()).getAll('records');
    return all.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)));
  });
}

export async function getRecord(id: string) {
  return guard(async () => (await db()).get('records', id));
}

/**
 * 기록과 새 사진을 한 번에 저장한다.
 * 이미 저장된 사진(같은 id)은 다시 쓰지 않는다.
 * 수정으로 더 이상 쓰이지 않는 사진은 같은 트랜잭션에서 정리한다.
 */
export async function saveRecord(record: RecordItem, drafts: DraftPhoto[]): Promise<void> {
  return guard(async () => {
    const d = await db();
    const tx = d.transaction(['photos', 'records', 'monthlies'], 'readwrite');
    const photos = tx.objectStore('photos');
    const records = tx.objectStore('records');

    const previous = await records.get(record.id);

    for (const p of drafts) {
      if (!record.photoIds.includes(p.id)) continue;
      const exists = await photos.getKey(p.id);
      if (exists) continue;
      const stored: StoredPhoto = {
        id: p.id,
        full: p.full,
        thumb: p.thumb,
        width: p.width,
        height: p.height,
        takenAt: p.takenAt,
        bytes: p.full.size + p.thumb.size,
        createdAt: Date.now(),
      };
      await photos.put(stored);
    }
    await records.put(record);

    // 기록 날짜의 달이 바뀌었다면 이전 달 월간 다이어리에서 뺀다
    if (previous && previous.date.slice(0, 7) !== record.date.slice(0, 7)) {
      await removeFromMonthly(tx.objectStore('monthlies'), previous.date.slice(0, 7), record.id);
    }

    if (previous) {
      const dropped = previous.photoIds.filter((id) => !record.photoIds.includes(id));
      await cleanupPhotos(tx as unknown as RWTx, dropped, record.id);
    }
    await tx.done;
  });
}

// 트랜잭션 도우미 함수용 느슨한 타입
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RWTx = { objectStore: (n: 'photos' | 'records' | 'monthlies') => any };

async function removeFromMonthly(
  store: { get: (k: string) => Promise<MonthlyItem | undefined>; put: (v: MonthlyItem) => Promise<unknown> },
  month: string,
  recordId: string,
) {
  const m = await store.get(month);
  if (!m || !m.recordIds.includes(recordId)) return;
  m.recordIds = m.recordIds.filter((id) => id !== recordId);
  if (m.coverRecordId === recordId) m.coverRecordId = m.recordIds[0];
  m.updatedAt = Date.now();
  await store.put(m);
}

/** 다른 기록이 쓰지 않는 사진만 지운다 */
async function cleanupPhotos(tx: RWTx, photoIds: string[], exceptRecordId: string) {
  if (!photoIds.length) return;
  const all: RecordItem[] = await tx.objectStore('records').getAll();
  const inUse = new Set<string>();
  for (const r of all) if (r.id !== exceptRecordId) r.photoIds.forEach((p) => inUse.add(p));
  const self = all.find((r) => r.id === exceptRecordId);
  self?.photoIds.forEach((p) => inUse.add(p));
  for (const id of photoIds) if (!inUse.has(id)) await tx.objectStore('photos').delete(id);
}

export async function deleteRecord(id: string): Promise<void> {
  return guard(async () => {
    const d = await db();
    const tx = d.transaction(['photos', 'records', 'monthlies'], 'readwrite');
    const rec = await tx.objectStore('records').get(id);
    if (!rec) {
      await tx.done;
      return;
    }
    await tx.objectStore('records').delete(id);
    await removeFromMonthly(tx.objectStore('monthlies'), rec.date.slice(0, 7), id);
    await cleanupPhotos(tx as unknown as RWTx, rec.photoIds, id + '__deleted');
    await tx.done;
  });
}

// ---------- 사진 ----------

export async function getPhoto(id: string) {
  return guard(async () => (await db()).get('photos', id));
}

// ---------- 월간 다이어리 ----------

export async function getMonthly(month: string) {
  return guard(async () => (await db()).get('monthlies', month));
}

export async function saveMonthly(m: MonthlyItem) {
  return guard(async () => {
    await (await db()).put('monthlies', m);
  });
}

// ---------- 용량 ----------

export interface UsageInfo {
  photoCount: number;
  recordCount: number;
  photoBytes: number; // 앱이 저장한 사진의 실제 용량 합계
  estimateUsage?: number; // 브라우저가 알려주는 이 사이트 전체 사용량 (지원할 때만)
  estimateQuota?: number; // 브라우저가 허용하는 대략적 한도 (지원할 때만)
  persisted?: boolean; // 브라우저가 보존 요청을 받아들였는지 (지원할 때만)
}

export async function getUsage(): Promise<UsageInfo> {
  return guard(async () => {
    const d = await db();
    const photos = await d.getAll('photos');
    const recordCount = await d.count('records');
    const info: UsageInfo = {
      photoCount: photos.length,
      recordCount,
      photoBytes: photos.reduce((s, p) => s + (p.bytes || p.full.size + p.thumb.size), 0),
    };
    try {
      if (navigator.storage?.estimate) {
        const e = await navigator.storage.estimate();
        info.estimateUsage = e.usage;
        info.estimateQuota = e.quota;
      }
      if (navigator.storage?.persisted) info.persisted = await navigator.storage.persisted();
    } catch {
      /* 지원하지 않는 브라우저 */
    }
    return info;
  });
}

/** 브라우저에 데이터 보존을 요청한다. 허락돼도 영구 보존이 보장되지는 않는다. */
export async function requestPersist(): Promise<boolean | undefined> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* 무시 */
  }
  return undefined;
}

export async function clearAll() {
  return guard(async () => {
    const d = await db();
    const tx = d.transaction(['photos', 'records', 'monthlies'], 'readwrite');
    await Promise.all([
      tx.objectStore('photos').clear(),
      tx.objectStore('records').clear(),
      tx.objectStore('monthlies').clear(),
    ]);
    await tx.done;
  });
}
