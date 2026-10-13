// 색감 프리셋과 네컷 프레임 색

import type { Adjust } from '../types';

export const NEUTRAL: Adjust = { brightness: 0, contrast: 0, saturation: 0, warmth: 0, fade: 0, grain: 0 };

export const PRESETS: { id: string; name: string; adjust: Adjust }[] = [
  { id: 'none', name: '원본', adjust: NEUTRAL },
  { id: 'film', name: '필름', adjust: { brightness: 0, contrast: 6, saturation: -15, warmth: 14, fade: 28, grain: 30 } },
  { id: 'warm', name: '따뜻하게', adjust: { brightness: 6, contrast: 0, saturation: 6, warmth: 40, fade: 0, grain: 0 } },
  { id: 'cool', name: '청량', adjust: { brightness: 8, contrast: 8, saturation: 14, warmth: -30, fade: 0, grain: 0 } },
  { id: 'mono', name: '흑백', adjust: { brightness: 0, contrast: 16, saturation: -100, warmth: 0, fade: 6, grain: 16 } },
  { id: 'vintage', name: '빈티지', adjust: { brightness: 0, contrast: -10, saturation: -30, warmth: 26, fade: 45, grain: 24 } },
];

export const SLIDERS: { key: keyof Adjust; name: string; min: number; max: number }[] = [
  { key: 'brightness', name: '밝기', min: -100, max: 100 },
  { key: 'contrast', name: '대비', min: -100, max: 100 },
  { key: 'saturation', name: '채도', min: -100, max: 100 },
  { key: 'warmth', name: '색온도', min: -100, max: 100 },
  { key: 'fade', name: '바랜 느낌', min: 0, max: 100 },
  { key: 'grain', name: '필름 노이즈', min: 0, max: 100 },
];
