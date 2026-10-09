import { useEffect, useState } from 'react';
import { appLink, canShareFiles, copyText, downloadImage, isIOS, shareImage } from '../lib/share';

/**
 * 저장·공유 화면.
 * 이미지 속 글자 링크는 대부분 SNS에서 눌리지 않으므로, 링크 복사를 따로 둔다.
 */
export function ShareSheet({
  makeImage,
  fileName,
  onClose,
}: {
  makeImage: () => Promise<Blob>;
  fileName: string;
  onClose: () => void;
}) {
  const [blob, setBlob] = useState<Blob>();
  const [url, setUrl] = useState<string>();
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [showLong, setShowLong] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const share = canShareFiles();
  const ios = isIOS();
  const link = appLink();

  useEffect(() => {
    let u: string | undefined;
    makeImage()
      .then((b) => {
        setBlob(b);
        u = URL.createObjectURL(b);
        setUrl(u);
      })
      .catch(() => setErr('이미지를 만들지 못했어요. 폰 메모리가 부족할 수 있어요. 다른 앱을 닫고 다시 시도해 주세요.'));
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onShare() {
    if (!blob) return;
    const r = await shareImage(blob, fileName);
    if (r === 'shared') setMsg('공유창으로 보냈어요.');
    else if (r === 'unsupported') setMsg('이 브라우저는 이미지 공유를 지원하지 않아요. 이미지 저장을 이용해 주세요.');
    else if (r === 'failed') setMsg('공유하지 못했어요. 이미지 저장을 이용해 주세요.');
  }
  function onDownload() {
    if (!blob) return;
    downloadImage(blob, fileName);
    setMsg(
      ios
        ? '저장이 안 됐다면 "크게 띄워서 길게 눌러 저장"을 이용해 주세요.'
        : '내려받기를 시작했어요. 안 됐다면 "크게 띄워서 길게 눌러 저장"을 이용해 주세요.',
    );
  }
  async function onCopy() {
    const ok = await copyText(link);
    if (ok) setMsg('앱 링크를 복사했어요. 인스타 스토리에서는 "링크" 스티커에 붙여 넣으면 돼요.');
    else {
      setShowLink(true);
      setMsg('자동 복사가 안 돼서 아래에 링크를 띄웠어요. 길게 눌러 복사해 주세요.');
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="저장하고 공유하기" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>저장하고 공유하기</h2>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        {err && <p className="error">{err}</p>}
        {!blob && !err && <p className="muted">이미지를 만드는 중…</p>}
        {blob && (
          <>
            <div className="sheet-actions">
              {share && (
                <button className="btn primary" onClick={onShare} data-testid="share-btn">
                  공유하기
                </button>
              )}
              <button className={`btn ${share ? '' : 'primary'}`} onClick={onDownload} data-testid="download-btn">
                이미지 저장
              </button>
              <button className="btn" onClick={() => setShowLong((v) => !v)} data-testid="longpress-btn">
                {showLong ? '크게 보기 닫기' : '크게 띄워서 길게 눌러 저장'}
              </button>
              <button className="btn ghost" onClick={onCopy} data-testid="copy-link-btn">
                앱 링크 복사
              </button>
            </div>
            {msg && (
              <p className="note" role="status">
                {msg}
              </p>
            )}
            {showLink && <input className="link-field" readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="앱 링크" />}
            {showLong && url && (
              <div className="longpress">
                <p className="muted">이미지를 길게 누른 뒤 "사진에 추가"(아이폰) 또는 "이미지 다운로드"(안드로이드)를 선택하세요.</p>
                <img src={url} alt="저장할 이미지" />
              </div>
            )}
            <p className="fineprint">이미지 크기 {Math.round(blob.size / 1024)}KB · 사진은 서버로 보내지 않아요.</p>
          </>
        )}
      </div>
    </div>
  );
}
