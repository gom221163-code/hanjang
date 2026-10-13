import { useEffect, useRef, useState } from 'react';
import { getPhoto } from '../storage/db';

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fmtBytes(b?: number) {
  if (b === undefined) return '알 수 없음';
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))}KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)}MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(1)}GB`;
}

/** 캔버스 미리보기. render 함수가 바뀌면 잠깐 기다렸다 다시 그린다 */
export function CanvasPreview({
  render,
  deps,
  label,
  delay = 200,
}: {
  render: (c: HTMLCanvasElement) => Promise<void>;
  deps: unknown[];
  label: string;
  delay?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');
  const seq = useRef(0);
  useEffect(() => {
    const my = ++seq.current;
    setBusy(true);
    const t = setTimeout(async () => {
      // 다른 캔버스에 먼저 그린 뒤 완성되면 옮겨서 깜빡임을 없앤다
      const off = document.createElement('canvas');
      try {
        await render(off);
        if (my !== seq.current || !ref.current) return;
        // 화면에 보이는 크기에 맞춰 줄여서 표시한다 (원본 1080px 캔버스를 그대로 올리면
        // 아이폰에서 메모리를 많이 써서 스크롤이 버벅인다). 저장 이미지는 따로 원본 크기로 만든다.
        const c = ref.current;
        const boxW = Math.min(c.parentElement?.clientWidth || 380, 380);
        const boxH = window.innerHeight * 0.56;
        const scale = Math.min(boxW / off.width, boxH / off.height, 1);
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        const tw = Math.max(1, Math.round(off.width * scale * dpr));
        const th = Math.max(1, Math.round(off.height * scale * dpr));
        c.width = tw;
        c.height = th;
        const cx = c.getContext('2d')!;
        cx.imageSmoothingQuality = 'high';
        cx.drawImage(off, 0, 0, tw, th);
        // 자동 테스트용: 원본 크기 결과를 남겨 둔다 (일반 사용자에게는 동작하지 않음)
        const w = window as unknown as { __keepPreview?: boolean; __previewFull?: string };
        if (w.__keepPreview) w.__previewFull = off.toDataURL('image/jpeg', 0.92);
        setErr('');
      } catch {
        if (my === seq.current) setErr('미리보기를 그리지 못했어요. 사진을 다시 골라 보세요.');
      } finally {
        off.width = off.height = 0;
        if (my === seq.current) setBusy(false);
      }
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return (
    <div className="preview">
      <canvas ref={ref} role="img" aria-label={label} data-testid="preview-canvas" />
      {busy && <div className="preview-busy">그리는 중…</div>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}

/** 저장된 사진의 작은 사진 주소 */
export function usePhotoThumb(id?: string) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!id) return;
    let u: string | undefined;
    let alive = true;
    getPhoto(id)
      .then((p) => {
        if (p && alive) {
          u = URL.createObjectURL(p.thumb);
          setUrl(u);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [id]);
  return url;
}

export function Thumb({ id, alt }: { id?: string; alt: string }) {
  const url = usePhotoThumb(id);
  return url ? <img src={url} alt={alt} loading="lazy" decoding="async" /> : <div className="thumb-empty" aria-hidden />;
}

export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <header className="topbar">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="뒤로">
          ←
        </button>
      ) : (
        <span className="brand">한 장</span>
      )}
      {onBack && <h1>{title}</h1>}
      <div className="topbar-right">{right}</div>
    </header>
  );
}

/** 화면 안에서 확인받는 상자 (브라우저 confirm 대신) */
export function ConfirmBox({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="confirm" role="alertdialog" aria-label={message}>
      <p>{message}</p>
      <div className="row">
        <button className="btn ghost" onClick={onCancel}>
          취소
        </button>
        <button className="btn danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
