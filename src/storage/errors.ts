// 저장 중 생긴 오류를 사용자가 이해할 수 있는 말로 바꾼다.

export class StorageError extends Error {
  kind: 'quota' | 'unavailable' | 'unknown';
  constructor(kind: StorageError['kind'], message: string) {
    super(message);
    this.kind = kind;
  }
}

export function toStorageError(err: unknown): StorageError {
  if (err instanceof StorageError) return err;
  const name = (err as { name?: string })?.name ?? '';
  const msg = String((err as { message?: string })?.message ?? err ?? '');
  if (name === 'QuotaExceededError' || /quota/i.test(msg)) {
    return new StorageError(
      'quota',
      '저장 공간이 부족해서 저장하지 못했어요. 기존 기록은 그대로 있어요. 오래된 기록을 지우거나 폰의 저장 공간을 확보한 뒤 다시 시도해 주세요.',
    );
  }
  if (name === 'InvalidStateError' || name === 'SecurityError' || /indexeddb|database/i.test(msg)) {
    return new StorageError(
      'unavailable',
      '이 브라우저에서는 기록을 저장할 수 없어요. 사생활 보호(시크릿) 모드라면 일반 모드로 열어 주세요.',
    );
  }
  return new StorageError(
    'unknown',
    '저장하지 못했어요. 기존 기록은 그대로 있어요. 잠시 후 다시 시도해 주세요.',
  );
}

export function friendlyMessage(err: unknown): string {
  return toStorageError(err).message;
}
