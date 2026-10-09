import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MonthlyItem, RecordItem } from '../types';
import { clearAll, deleteRecord, getMonthly, getPhoto, getRecord, getUsage, listRecords, saveMonthly, type UsageInfo } from '../storage/db';
import { friendlyMessage } from '../storage/errors';
import { renderRecord } from '../render/record';
import { MONTHLY_MAX, renderMonthly } from '../render/monthly';
import { clearPhotoCache, fmtKo, fmtShort, type PhotoSource } from '../render/draw';
import { canvasToImage } from '../lib/share';
import { CanvasPreview, ConfirmBox, Thumb, TopBar, fmtBytes, todayStr } from './common';
import { ShareSheet } from './ShareSheet';

// ---------------- 안내 문구 (첫 방문, 설정에서 공통 사용) ----------------

export function DataNotice() {
  return (
    <ul className="notice-list">
      <li>사진과 기록은 <strong>이 폰의 브라우저 안에만</strong> 저장돼요. 서버로 보내지 않아요.</li>
      <li>원본 사진이 아니라 <strong>줄인 사진(긴 변 최대 2048px)</strong>만 저장해요. 원본은 사진첩에 그대로 있어요.</li>
      <li>
        브라우저 데이터를 지우거나, 기기를 바꾸거나, 브라우저가 저장 공간을 정리하면 <strong>기록이 사라질 수 있어요.</strong> 홈 화면에 추가해도 영구 보존이 보장되지는 않아요.
      </li>
      <li>소중한 기록은 <strong>이미지로 저장해서 사진첩에 따로 보관</strong>해 주세요.</li>
    </ul>
  );
}

export function Onboarding({ onStart }: { onStart: () => void }) {
  return (
    <div className="screen onboard">
      <div className="onboard-hero">
        <p className="eyebrow">사진 다이어리</p>
        <h1>
          오늘을 한 장으로,
          <br />
          한 달을 한 장으로.
        </h1>
        <p className="lead">사진 고르고 한 줄 쓰면 기록 카드가 완성돼요. 월말엔 모아서 한 달 다이어리를 만들어요.</p>
      </div>
      <section className="block">
        <h2>시작하기 전에</h2>
        <DataNotice />
      </section>
      <div className="bottom-bar">
        <button className="btn primary wide" onClick={onStart} data-testid="start-btn">
          첫 기록 만들기
        </button>
      </div>
    </div>
  );
}

// ---------------- 홈 ----------------

function monthOf(d: string) {
  return d.slice(0, 7);
}
function shiftMonth(m: string, k: number) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + k, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function Home({
  month,
  setMonth,
  onNew,
  onOpen,
  onMonthly,
  onSettings,
}: {
  month: string;
  setMonth: (m: string) => void;
  onNew: () => void;
  onOpen: (id: string) => void;
  onMonthly: () => void;
  onSettings: () => void;
}) {
  const [records, setRecords] = useState<RecordItem[]>();
  const [err, setErr] = useState('');
  useEffect(() => {
    listRecords()
      .then(setRecords)
      .catch((e) => {
        setErr(friendlyMessage(e));
        setRecords([]);
      });
  }, []);
  const inMonth = useMemo(() => (records ?? []).filter((r) => monthOf(r.date) === month), [records, month]);
  const [y, mo] = month.split('-').map(Number);
  const isCurrent = month === monthOf(todayStr());

  return (
    <div className="screen home">
      <TopBar
        title="한 장"
        right={
          <button className="icon-btn" onClick={onSettings} aria-label="저장 공간과 안내" data-testid="settings-btn">
            ⓘ
          </button>
        }
      />
      <div className="month-nav">
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="이전 달">‹</button>
        <div className="month-label">
          <span className="month-num">{String(mo).padStart(2, '0')}</span>
          <span className="month-meta">
            {y}년 {mo}월<br />
            <strong data-testid="month-count">기록 {inMonth.length}개</strong>
          </span>
        </div>
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="다음 달" disabled={isCurrent}>›</button>
      </div>

      {err && <p className="error pad">{err}</p>}

      <div className="home-actions">
        <button className="btn primary wide" onClick={onNew} data-testid="new-record">
          ＋ 오늘의 기록 만들기
        </button>
        <button className="btn wide" onClick={onMonthly} data-testid="open-monthly">
          {mo}월 다이어리 {inMonth.length ? `만들기 · ${Math.min(inMonth.length, MONTHLY_MAX)}개 담기` : '보기'}
        </button>
      </div>

      {records === undefined ? (
        <p className="muted pad">불러오는 중…</p>
      ) : inMonth.length === 0 ? (
        <div className="empty">
          <p>{isCurrent ? '이번 달 첫 기록을 남겨 보세요.' : '이 달에는 기록이 없어요.'}</p>
          <p className="muted">기록이 쌓이면 월말에 한 장짜리 다이어리로 모을 수 있어요.</p>
        </div>
      ) : (
        <ul className="record-grid" aria-label="이달의 기록">
          {inMonth.map((r) => (
            <li key={r.id}>
              <button onClick={() => onOpen(r.id)} data-testid="record-item">
                <Thumb id={r.photoIds[0]} alt={r.title || fmtKo(r.date)} />
                <span className="rg-date">{fmtShort(r.date)}</span>
                <span className="rg-title">{r.title || '제목 없음'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="fineprint pad">기록은 이 브라우저에만 있어요. 소중한 기록은 이미지로 저장해 두세요.</p>
    </div>
  );
}

// ---------------- 사진 불러오기 도우미 ----------------

async function loadSources(ids: string[]): Promise<PhotoSource[]> {
  const out: PhotoSource[] = [];
  for (const id of ids) {
    const p = await getPhoto(id);
    if (p) out.push(p);
  }
  return out;
}

// ---------------- 기록 보기 ----------------

export function RecordView({ id, onBack, onEdit, onDeleted }: { id: string; onBack: () => void; onEdit: () => void; onDeleted: () => void }) {
  const [rec, setRec] = useState<RecordItem | null>();
  const [photos, setPhotos] = useState<PhotoSource[]>([]);
  const [share, setShare] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await getRecord(id);
        setRec(r ?? null);
        if (r) setPhotos(await loadSources(r.photoIds));
      } catch (e) {
        setErr(friendlyMessage(e));
      }
    })();
  }, [id]);

  async function onDelete() {
    try {
      await deleteRecord(id);
      onDeleted();
    } catch (e) {
      setErr(friendlyMessage(e));
      setConfirm(false);
    }
  }

  const makeImage = useCallback(async () => {
    const c = document.createElement('canvas');
    await renderRecord(c, rec!, photos);
    const b = await canvasToImage(c);
    c.width = c.height = 0;
    return b;
  }, [rec, photos]);

  if (rec === undefined) return <div className="screen"><TopBar title="기록" onBack={onBack} /><p className="muted pad">불러오는 중…</p>{err && <p className="error pad">{err}</p>}</div>;
  if (rec === null) return <div className="screen"><TopBar title="기록" onBack={onBack} /><p className="pad">기록을 찾을 수 없어요.</p></div>;

  return (
    <div className="screen">
      <TopBar title={fmtKo(rec.date)} onBack={onBack} />
      <section className="block">
        {photos.length < rec.photoIds.length && <p className="error">일부 사진을 찾을 수 없어요. 브라우저 데이터가 정리됐을 수 있어요.</p>}
        <CanvasPreview label="기록 카드" render={(c) => renderRecord(c, rec, photos)} deps={[rec, photos]} delay={0} />
      </section>
      {err && <p className="error pad">{err}</p>}
      {confirm && <ConfirmBox message="이 기록을 지울까요? 월간 다이어리에서도 빠져요." confirmLabel="지우기" onConfirm={onDelete} onCancel={() => setConfirm(false)} />}
      <div className="bottom-bar row">
        <button className="btn ghost" onClick={() => setConfirm(true)} data-testid="delete-record">지우기</button>
        <button className="btn" onClick={onEdit} data-testid="edit-record">수정</button>
        <button className="btn primary grow" onClick={() => setShare(true)} data-testid="open-share">저장·공유</button>
      </div>
      {share && <ShareSheet makeImage={makeImage} fileName={`hanjang-${rec.date}.jpg`} onClose={() => setShare(false)} />}
    </div>
  );
}

// ---------------- 월간 다이어리 ----------------

export function MonthlyEditor({ month, onBack, onNew }: { month: string; onBack: () => void; onNew: () => void }) {
  const [all, setAll] = useState<RecordItem[]>();
  const [selected, setSelected] = useState<string[]>([]);
  const [cover, setCover] = useState<string>();
  const [title, setTitle] = useState('');
  const [variant, setVariant] = useState(0);
  const [photoMap, setPhotoMap] = useState<Record<string, PhotoSource>>({});
  const [saved, setSaved] = useState<MonthlyItem>();
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [share, setShare] = useState(false);
  const [limitMsg, setLimitMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const recs = (await listRecords()).filter((r) => r.date.slice(0, 7) === month);
        recs.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
        const m = await getMonthly(month);
        const map: Record<string, PhotoSource> = {};
        for (const r of recs) {
          const p = r.photoIds[0] ? await getPhoto(r.photoIds[0]) : undefined;
          if (p) map[r.id] = p;
        }
        setPhotoMap(map);
        setAll(recs);
        if (m) {
          const valid = m.recordIds.filter((id) => recs.some((r) => r.id === id));
          setSelected(valid);
          setCover(m.coverRecordId && valid.includes(m.coverRecordId) ? m.coverRecordId : valid[0]);
          setTitle(m.title);
          setVariant(m.variant);
          setSaved(m);
        } else {
          // 처음이면 최근 기록부터 최대 9개를 자동으로 담는다
          const latest = recs.slice(-MONTHLY_MAX).map((r) => r.id);
          setSelected(latest);
          setCover(latest[latest.length - 1]);
        }
      } catch (e) {
        setErr(friendlyMessage(e));
        setAll([]);
      }
    })();
  }, [month]);

  const ordered = useMemo(() => {
    if (!all) return [];
    const sel = all.filter((r) => selected.includes(r.id));
    const c = sel.find((r) => r.id === cover) ?? sel[0];
    return c ? [c, ...sel.filter((r) => r.id !== c.id)] : [];
  }, [all, selected, cover]);

  function toggle(id: string) {
    setLimitMsg('');
    if (selected.includes(id)) {
      const next = selected.filter((x) => x !== id);
      setSelected(next);
      if (cover === id) setCover(next[0]);
    } else {
      if (selected.length >= MONTHLY_MAX) {
        setLimitMsg(`한 장에는 최대 ${MONTHLY_MAX}개까지 담을 수 있어요. 다른 기록을 먼저 빼 주세요.`);
        return;
      }
      setSelected([...selected, id]);
      if (!cover) setCover(id);
    }
  }

  const [y, mo] = month.split('-').map(Number);
  const input = useMemo(
    () => ({
      month,
      title,
      variant,
      records: ordered,
      photoOf: (r: RecordItem) => photoMap[r.id],
      retroOf: (r: RecordItem) => (r.filter.retro ? r.filter.strength : 0),
    }),
    [month, title, variant, ordered, photoMap],
  );

  async function onSave() {
    const m: MonthlyItem = { month, recordIds: ordered.map((r) => r.id), coverRecordId: ordered[0]?.id, title: title.trim(), variant, updatedAt: Date.now() };
    try {
      await saveMonthly(m);
      setSaved(m);
      setMsg('월간 다이어리를 저장했어요.');
      setErr('');
    } catch (e) {
      setErr(friendlyMessage(e));
    }
  }

  const makeImage = useCallback(async () => {
    const c = document.createElement('canvas');
    await renderMonthly(c, input);
    const b = await canvasToImage(c);
    c.width = c.height = 0;
    return b;
  }, [input]);

  if (!all) return <div className="screen"><TopBar title={`${mo}월 다이어리`} onBack={onBack} /><p className="muted pad">불러오는 중…</p></div>;

  if (all.length === 0)
    return (
      <div className="screen">
        <TopBar title={`${mo}월 다이어리`} onBack={onBack} />
        {err && <p className="error pad">{err}</p>}
        <div className="empty">
          <p>{y}년 {mo}월에는 아직 기록이 없어요.</p>
          <p className="muted">기록 카드를 하나 이상 만들면 월간 다이어리를 만들 수 있어요.</p>
          <button className="btn primary" onClick={onNew}>오늘의 기록 만들기</button>
        </div>
      </div>
    );

  return (
    <div className="screen">
      <TopBar title={`${mo}월 다이어리`} onBack={onBack} />
      <section className="block">
        {ordered.length ? (
          <CanvasPreview label="월간 다이어리 미리보기" render={(c) => renderMonthly(c, input)} deps={[input]} />
        ) : (
          <div className="empty small">
            <p>담을 기록을 하나 이상 골라 주세요.</p>
          </div>
        )}
        {ordered.length >= 2 && ordered.length <= 6 && (
          <button className="btn small" onClick={() => setVariant((v) => (v + 1) % 2)} data-testid="variant-btn">
            배치 바꾸기
          </button>
        )}
      </section>

      <section className="block form">
        <label>
          <span>한 달 제목</span>
          <input id="monthly-title" type="text" maxLength={30} placeholder={`예: ${mo}월은 생각보다 따뜻했다`} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
      </section>

      <section className="block">
        <div className="block-head">
          <h2>담을 기록</h2>
          <span className="muted" data-testid="monthly-selected">{selected.length}/{MONTHLY_MAX}</span>
        </div>
        <p className="fineprint">
          ★을 누른 기록이 가장 크게 들어가요. 기록 수에 맞춰 배치가 바뀌고, 7개 이상이면 날짜 순서대로 필름처럼 놓여요.
        </p>
        {limitMsg && <p className="error" role="alert">{limitMsg}</p>}
        <ul className="pick-list">
          {all.map((r) => {
            const on = selected.includes(r.id);
            const isCover = on && (cover ?? ordered[0]?.id) === r.id;
            return (
              <li key={r.id} className={on ? 'on' : ''}>
                <button className="pick-main" onClick={() => toggle(r.id)} aria-pressed={on} data-testid="monthly-pick">
                  <Thumb id={r.photoIds[0]} alt="" />
                  <span>
                    <strong>{fmtShort(r.date)}</strong>
                    <br />
                    <span className="muted">{r.title || '제목 없음'}</span>
                  </span>
                  <span className="check" aria-hidden>{on ? '✓' : ''}</span>
                </button>
                {on && (
                  <button className={`star ${isCover ? 'on' : ''}`} onClick={() => setCover(r.id)} aria-label="대표로 지정" aria-pressed={isCover}>
                    ★
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {err && <p className="error pad">{err}</p>}
      {msg && <p className="note pad" role="status">{msg}</p>}
      <div className="bottom-bar row">
        <button className="btn" onClick={onSave} disabled={!ordered.length} data-testid="save-monthly">
          {saved ? '수정 저장' : '저장'}
        </button>
        <button className="btn primary grow" onClick={() => setShare(true)} disabled={!ordered.length} data-testid="share-monthly">
          이미지로 저장·공유
        </button>
      </div>
      {share && <ShareSheet makeImage={makeImage} fileName={`hanjang-${month}.jpg`} onClose={() => setShare(false)} />}
    </div>
  );
}

// ---------------- 저장 공간과 안내 ----------------

export function Settings({ onBack, onCleared }: { onBack: () => void; onCleared: () => void }) {
  const [u, setU] = useState<UsageInfo>();
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    getUsage().then(setU).catch((e) => setErr(friendlyMessage(e)));
  }, []);
  async function wipe() {
    try {
      await clearAll();
      clearPhotoCache();
      onCleared();
    } catch (e) {
      setErr(friendlyMessage(e));
    }
  }
  return (
    <div className="screen">
      <TopBar title="저장 공간과 안내" onBack={onBack} />
      <section className="block">
        <h2>지금 쓰고 있는 공간</h2>
        {err && <p className="error">{err}</p>}
        {!u && !err && <p className="muted">계산 중…</p>}
        {u && (
          <dl className="usage" data-testid="usage">
            <dt>기록</dt>
            <dd>{u.recordCount}개</dd>
            <dt>저장한 사진</dt>
            <dd>{u.photoCount}장 · {fmtBytes(u.photoBytes)}</dd>
            <dt>브라우저가 알려준 사용량</dt>
            <dd>
              {u.estimateUsage !== undefined ? fmtBytes(u.estimateUsage) : '이 브라우저는 알려주지 않아요'}
              {u.estimateQuota !== undefined && <span className="muted"> / 한도 약 {fmtBytes(u.estimateQuota)}</span>}
            </dd>
            <dt>보존 요청</dt>
            <dd>
              {u.persisted === undefined
                ? '이 브라우저는 지원하지 않아요'
                : u.persisted
                  ? '브라우저가 받아들였어요 (그래도 영구 보존이 보장되지는 않아요)'
                  : '받아들여지지 않았어요'}
            </dd>
          </dl>
        )}
        <p className="fineprint">사진 용량은 실제로 저장된 파일 크기를 더한 값이에요. 브라우저 사용량과 한도는 브라우저가 계산한 대략적인 값이라 실제와 다를 수 있어요.</p>
      </section>
      <section className="block">
        <h2>꼭 알아 두세요</h2>
        <DataNotice />
      </section>
      <section className="block">
        <h2>모든 기록 지우기</h2>
        <p className="muted">이 브라우저에 저장된 기록, 사진, 월간 다이어리를 모두 지워요. 되돌릴 수 없어요.</p>
        {confirm ? (
          <ConfirmBox message="정말 모두 지울까요?" confirmLabel="모두 지우기" onConfirm={wipe} onCancel={() => setConfirm(false)} />
        ) : (
          <button className="btn danger" onClick={() => setConfirm(true)}>모두 지우기</button>
        )}
      </section>
    </div>
  );
}
