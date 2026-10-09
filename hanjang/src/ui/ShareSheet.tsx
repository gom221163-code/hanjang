import { useEffect, useState } from 'react';
import { appLink, canShareFiles, copyText, downloadImage, inAppBrowser, isIOS, openInExternalBrowser, shareImage } from '../lib/share';

/**
 * 저장·공유 화면.
 * - 아이폰: 공유창의 "이미지 저장"으로 사진첩에 저장한다. (내려받기 방식은 이미지를 크게 열어버려서 쓰지 않는다)
 * - 안드로이드·PC: 공유창 + 파일로 내려받기
 * - 카카오톡 등 앱 안 브라우저: 공유창이 막혀 있는 경우가 많아 바깥 브라우저로 열도록 안내한다.
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
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [showLink, setShowLink] = useState(false);
  const share = canShareFiles();
  const ios = isIOS();
  const inApp = inAppBrowser();
  const link = appLink();

  useEffect(() => {
    makeImage()
      .then(setBlob)
      .catch(() => setErr('이미지를 만들지 못했어요. 폰 메모리가 부족할 수 있어요. 다른 앱을 닫고 다시 시도해 주세요.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onShare() {
    if (!blob) return;
    const r = await shareImage(blob, fileName);
    if (r === 'shared') setMsg(ios ? '공유창에서 "이미지 저장"을 눌렀다면 사진첩에 저장됐어요.' : '공유창으로 보냈어요.');
    else if (r === 'unsupported' || r === 'failed')
      setMsg(ios ? '이 브라우저에서는 저장할 수 없어요. Safari로 열어서 다시 시도해 주세요.' : '공유창을 열지 못했어요. "파일로 내려받기"를 이용해 주세요.');
  }
  function onDownload() {
    if (!blob) return;
    downloadImage(blob, fileName);
    setMsg('내려받기를 시작했어요. 갤러리나 "다운로드" 폴더를 확인해 주세요.');
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

        {inApp && (
          <div className="inapp" role="alert" data-testid="inapp-notice">
            <p>
              <strong>{inApp === 'kakao' ? '카카오톡' : '앱'} 안에서 열려 있어요.</strong> 여기서는 사진 저장이 막혀 있을 수 있어요.{' '}
              {ios ? 'Safari' : 'Chrome'}에서 열면 저장할 수 있어요.
            </p>
            {inApp === 'kakao' ? (
              <button className="btn primary" onClick={openInExternalBrowser}>
                {ios ? 'Safari' : 'Chrome'}로 열기
              </button>
            ) : (
              <p className="fineprint">화면 오른쪽 위(또는 아래) 메뉴에서 "다른 브라우저로 열기"를 눌러 주세요.</p>
            )}
          </div>
        )}

        {err && <p className="error">{err}</p>}
        {!blob && !err && <p className="muted">이미지를 만드는 중…</p>}
        {blob && (
          <>
            <div className="sheet-actions">
              {share && (
                <button className="btn primary" onClick={onShare} data-testid="share-btn">
                  {ios ? '사진첩에 저장 · 공유하기' : '저장 · 공유하기'}
                </button>
              )}
              {share && (
                <p className="fineprint center">
                  {ios ? '공유창이 뜨면 "이미지 저장"을 누르면 사진첩에 저장돼요.' : '공유창에서 갤러리나 보낼 앱을 골라 주세요.'}
                </p>
              )}
              {!ios && (
                <button className={`btn ${share ? '' : 'primary'}`} onClick={onDownload} data-testid="download-btn">
                  파일로 내려받기
                </button>
              )}
              {ios && !share && !inApp && <p className="error">이 브라우저에서는 사진 저장을 지원하지 않아요. Safari로 열어 주세요.</p>}
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
            <p className="fineprint">이미지 크기 {Math.round(blob.size / 1024)}KB · 사진은 서버로 보내지 않아요.</p>
          </>
        )}
      </div>
    </div>
  );
}
