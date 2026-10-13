// 사용 통계 (Umami)
// - Vercel 환경 변수 VITE_UMAMI_WEBSITE_ID 에 Umami의 Website ID를 넣으면 켜진다. 없으면 아무것도 보내지 않는다.
// - 보내는 것: 어떤 템플릿·프레임·색감을 썼는지, 사진이 몇 장인지 같은 "선택한 값"과 횟수뿐이다.
// - 보내지 않는 것: 사진, 제목, 기록 글, 날짜.

const WEBSITE_ID = (import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined)?.trim();
const SCRIPT_URL = (import.meta.env.VITE_UMAMI_SCRIPT_URL as string | undefined)?.trim() || 'https://cloud.umami.is/script.js';

export const analyticsEnabled = !!WEBSITE_ID;

declare global {
  interface Window {
    umami?: { track: (name: string, data?: Record<string, string | number | boolean>) => void };
  }
}

export function initAnalytics() {
  if (!WEBSITE_ID || document.querySelector('script[data-website-id]')) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = SCRIPT_URL;
  s.setAttribute('data-website-id', WEBSITE_ID);
  s.setAttribute('data-do-not-track', 'true'); // 브라우저의 "추적 안 함" 설정을 존중
  document.head.appendChild(s);
}

export function track(name: string, data?: Record<string, string | number | boolean>) {
  if (!WEBSITE_ID) return;
  try {
    window.umami?.track(name, data);
  } catch {
    /* 통계 실패는 앱 동작에 영향을 주지 않는다 */
  }
}
