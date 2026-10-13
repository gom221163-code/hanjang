// 캔버스에 글자를 그리기 전에 글꼴이 실제로 불러와졌는지 확인한다.
// 한글 글꼴은 글자 범위별로 나뉘어 필요할 때만 받아지므로,
// 그릴 글자를 직접 넘겨서 해당 조각까지 받아 둔다.
// 이렇게 하지 않으면 저장 이미지의 글자가 기본 글꼴로 바뀔 수 있다.

export const F = {
  serif: '"Gowun Batang", "Noto Serif KR", serif',
  sans: '"Gowun Dodum", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  pen: '"Nanum Pen Script", "Gowun Dodum", cursive',
  display: '"Cormorant Garamond", "Gowun Batang", serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
};

const SPECS = [
  `400 32px ${F.serif}`,
  `400 32px ${F.sans}`,
  `400 32px ${F.pen}`,
  `italic 500 32px ${F.display}`,
  `400 32px ${F.mono}`,
  `500 32px ${F.mono}`,
];

// 화면에 고정으로 쓰이는 글자들
const BASE =
  '한 장 0123456789 월화수목금토일요일 아직 이달의 기록이 없어요 개 ' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz .,/·\'_…!';

export async function ensureFonts(text = ''): Promise<void> {
  if (!document.fonts?.load) return;
  const sample = BASE + text;
  const load = Promise.all(SPECS.map((s) => document.fonts.load(s, sample).catch(() => []))).then(() => undefined);
  // 네트워크가 느려도 4초 뒤에는 그린다 (이 경우 기본 글꼴로 대체될 수 있음)
  await Promise.race([load, new Promise<void>((r) => setTimeout(r, 4000))]);
}
