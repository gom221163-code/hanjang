// 앱 전체에서 쓰는 데이터 모양

export type TemplateId = 'fourcut' | 'polaroid' | 'minimal' | 'retro' | 'note';
export type Ratio = '9:16' | '1:1';

/** 저장된 사진. 원본이 아니라 긴 변 2048px로 줄인 축소본이다. */
export interface StoredPhoto {
  id: string; // 원본 파일 내용으로 만든 고유값 (같은 사진은 한 번만 저장)
  full: Blob; // 축소본 (긴 변 최대 2048px)
  thumb: Blob; // 목록·월간 다이어리용 작은 사진 (긴 변 최대 720px)
  width: number; // 축소본 크기
  height: number;
  takenAt?: string; // 사진 파일에서 읽은 촬영일 (YYYY-MM-DD), 읽지 못하면 없음
  bytes: number; // full + thumb 실제 용량
  createdAt: number;
}

export interface Adjust {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  fade: number;
  grain: number;
}

export interface FilterSetting {
  retro: boolean;
  strength: number; // 0~100
  preset?: string; // 고른 색감 프리셋 id ('custom'이면 직접 조절)
  adjust?: Adjust; // 색감 조절 값. 없으면 원본 색
}

/** 오늘의 기록 카드 */
export interface RecordItem {
  id: string;
  createdAt: number;
  updatedAt: number;
  date: string; // 기록 날짜 YYYY-MM-DD
  title: string;
  text: string;
  template: TemplateId;
  ratio: Ratio;
  photoIds: string[]; // 표시 순서
  filter: FilterSetting;
  frame?: string; // 네컷 프레임 색 id
}

/** 월간 다이어리. 월마다 하나. */
export interface MonthlyItem {
  month: string; // YYYY-MM
  recordIds: string[];
  coverRecordId?: string; // 가장 크게 들어갈 기록
  title: string;
  variant: number; // 배치 변형 (0, 1)
  updatedAt: number;
}

/** 아직 저장 전, 화면에서 다루는 사진 */
export interface DraftPhoto {
  id: string;
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
  takenAt?: string;
  previewUrl: string;
}
