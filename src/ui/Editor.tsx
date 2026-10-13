import { useEffect, useMemo, useRef, useState } from 'react';
import type { Adjust, DraftPhoto, Ratio, RecordItem, TemplateId } from '../types';
import { getPhoto, getRecord, newId, requestPersist, saveRecord } from '../storage/db';
import { friendlyMessage } from '../storage/errors';
import { photoErrorMessage, prepareFile } from '../lib/image';
import { maxPhotos, renderRecord, TEMPLATES } from '../render/record';
import { NEUTRAL, PRESETS, SLIDERS } from '../render/presets';
import { FRAME_SETS, frameSwatch, setOf } from '../render/frames';
import { track } from '../lib/analytics';
import { isNeutral } from '../render/draw';
import { CanvasPreview, TopBar, todayStr } from './common';

export function Editor({ recordId, onBack, onSaved }: { recordId?: string; onBack: () => void; onSaved: (id: string) => void }) {
  const [loading, setLoading] = useState(!!recordId);
  const [original, setOriginal] = useState<RecordItem>();
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [date, setDate] = useState(todayStr());
  const [dateTouched, setDateTouched] = useState(false);
  const [dateHint, setDateHint] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [template, setTemplate] = useState<TemplateId>('fourcut');
  const [frame, setFrame] = useState('white');
  const [frameSet, setFrameSet] = useState('basic');
  const [preset, setPreset] = useState('none');
  const [adjust, setAdjust] = useState<Adjust>(NEUTRAL);
  const [showSliders, setShowSliders] = useState(false);
  const [ratio, setRatio] = useState<Ratio>('9:16');
  const [retro, setRetro] = useState(false);
  const [strength, setStrength] = useState(70);
  const [filterTouched, setFilterTouched] = useState(false);
  const [compare, setCompare] = useState(false);
  const [busy, setBusy] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 수정 모드: 기존 기록 불러오기
  useEffect(() => {
    if (!recordId) return;
    (async () => {
      try {
        const r = await getRecord(recordId);
        if (!r) {
          setErrors(['기록을 찾을 수 없어요. 이미 지워졌을 수 있어요.']);
          return;
        }
        const ps: DraftPhoto[] = [];
        for (const id of r.photoIds) {
          const p = await getPhoto(id);
          if (p) ps.push({ id: p.id, full: p.full, thumb: p.thumb, width: p.width, height: p.height, takenAt: p.takenAt, previewUrl: URL.createObjectURL(p.thumb) });
        }
        setOriginal(r);
        setPhotos(ps);
        setDate(r.date);
        setDateTouched(true);
        setTitle(r.title);
        setText(r.text);
        setTemplate(r.template);
        setRatio(r.ratio);
        setRetro(r.filter.retro);
        setStrength(r.filter.strength);
        setFilterTouched(true);
        setFrame(r.frame ?? 'white');
        setFrameSet(setOf(r.frame).id);
        setAdjust(r.filter.adjust ?? NEUTRAL);
        setPreset(r.filter.preset ?? (r.filter.adjust && !isNeutral(r.filter.adjust) ? 'custom' : 'none'));
      } catch (e) {
        setErrors([friendlyMessage(e)]);
      } finally {
        setLoading(false);
      }
    })();
  }, [recordId]);

  // 화면을 떠날 때 미리보기 주소 정리
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  async function onFiles(list: FileList | null) {
    if (!list || !list.length) return;
    const files = Array.from(list);
    const room = MAX_PHOTOS - photos.length;
    const errs: string[] = [];
    if (files.length > room)
      errs.push(
        `이 템플릿은 사진을 최대 ${MAX_PHOTOS}장까지 넣을 수 있어요. 앞의 ${Math.max(0, room)}장만 넣었어요.` +
          (template !== 'fourcut' ? ' 네컷 템플릿은 6장까지 돼요.' : ''),
      );
    const take = files.slice(0, Math.max(0, room));
    const added: DraftPhoto[] = [];
    // 메모리를 아끼려고 한 장씩 처리한다
    for (let i = 0; i < take.length; i++) {
      setBusy(`사진 준비 중 ${i + 1}/${take.length}`);
      try {
        const d = await prepareFile(take[i]);
        if (photos.some((p) => p.id === d.id) || added.some((p) => p.id === d.id)) {
          URL.revokeObjectURL(d.previewUrl);
          errs.push(`'${take[i].name}'은(는) 이미 넣은 사진이에요.`);
          continue;
        }
        added.push(d);
      } catch (e) {
        errs.push(photoErrorMessage(take[i].name, e));
      }
    }
    setBusy('');
    setErrors(errs);
    if (added.length) {
      const next = [...photos, ...added];
      setPhotos(next);
      // 날짜를 직접 바꾸지 않았다면, 첫 사진의 촬영일로 맞춘다
      if (!dateTouched) {
        const taken = next.find((p) => p.takenAt)?.takenAt;
        if (taken) {
          setDate(taken);
          setDateHint('사진 촬영일로 날짜를 맞췄어요.');
        }
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  function move(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= photos.length) return;
    const next = photos.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setPhotos(next);
  }
  function remove(i: number) {
    URL.revokeObjectURL(photos[i].previewUrl);
    setPhotos(photos.filter((_, k) => k !== i));
  }
  function pickTemplate(t: TemplateId) {
    setTemplate(t);
    if (!filterTouched) setRetro(t === 'retro');
  }

  const MAX_PHOTOS = maxPhotos(template);
  const neutral = isNeutral(adjust);
  const recLike = useMemo(
    () => ({
      date,
      title,
      text,
      template,
      ratio,
      frame,
      filter: { retro, strength, preset, adjust: neutral ? undefined : adjust },
    }),
    [date, title, text, template, ratio, frame, retro, strength, preset, adjust, neutral],
  );

  function pickPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPreset(id);
    setAdjust(p.adjust);
  }
  function slide(key: keyof Adjust, v: number) {
    setAdjust((a) => ({ ...a, [key]: v }));
    setPreset('custom');
  }

  async function save() {
    if (!photos.length || saving) return;
    setSaving(true);
    setErrors([]);
    const now = Date.now();
    const rec: RecordItem = {
      id: original?.id ?? newId(),
      createdAt: original?.createdAt ?? now,
      updatedAt: now,
      ...recLike,
      title: title.trim(),
      text: text.trim(),
      photoIds: photos.map((p) => p.id),
    };
    try {
      await saveRecord(rec, photos);
      track('record_saved', {
        template: rec.template,
        ratio: rec.ratio,
        frame: rec.template === 'fourcut' ? rec.frame ?? 'white' : '-',
        frameSet: rec.template === 'fourcut' ? setOf(rec.frame).id : '-',
        preset: rec.filter.adjust ? rec.filter.preset ?? 'custom' : 'none',
        retro: rec.filter.retro,
        photos: rec.photoIds.length,
        edit: !!original,
      });
      requestPersist(); // 보존 요청 (허락돼도 영구 보존이 보장되지는 않음)
      onSaved(rec.id);
    } catch (e) {
      setErrors([friendlyMessage(e)]);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="screen"><TopBar title="기록 수정" onBack={onBack} /><p className="muted pad">불러오는 중…</p></div>;

  return (
    <div className="screen editor">
      <TopBar title={recordId ? '기록 수정' : '오늘의 기록'} onBack={onBack} />

      <section className="block">
        <div className="block-head">
          <h2>사진</h2>
          <span className="muted">{photos.length}/{MAX_PHOTOS}</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
          data-testid="file-input"
        />
        {photos.length === 0 ? (
          <button className="pick-empty" onClick={() => fileRef.current?.click()} disabled={!!busy}>
            <span className="pick-plus">＋</span>
            <strong>사진 고르기</strong>
            <span className="muted">1~{MAX_PHOTOS}장 · 고른 사진만 이 폰 안에서 처리해요</span>
          </button>
        ) : (
          <ul className="strip" aria-label="고른 사진">
            {photos.map((p, i) => (
              <li key={p.id} data-testid="draft-photo">
                <img src={p.previewUrl} alt={`${i + 1}번째 사진`} />
                <div className="strip-ctl">
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="앞으로">‹</button>
                  <button onClick={() => remove(i)} aria-label="빼기" data-testid="remove-photo">✕</button>
                  <button onClick={() => move(i, 1)} disabled={i === photos.length - 1} aria-label="뒤로">›</button>
                </div>
              </li>
            ))}
            {photos.length < MAX_PHOTOS && (
              <li>
                <button className="strip-add" onClick={() => fileRef.current?.click()} disabled={!!busy} aria-label="사진 더 넣기">＋</button>
              </li>
            )}
          </ul>
        )}
        {photos.length > MAX_PHOTOS && (
          <p className="note" role="status" data-testid="extra-photo-note">
            이 템플릿에는 앞의 {MAX_PHOTOS}장만 들어가요. 나머지 사진은 네컷 템플릿에서 보여요.
          </p>
        )}
        {busy && <p className="muted" role="status">{busy}</p>}
        {errors.map((e) => (
          <p key={e} className="error" role="alert">{e}</p>
        ))}
      </section>

      {photos.length > 0 && (
        <>
          <section className="block">
            <CanvasPreview
              label="기록 카드 미리보기"
              render={(c) => renderRecord(c, recLike, photos, { original: compare })}
              deps={[recLike, photos, compare]}
            />
            {(retro || !neutral) && (
              <button
                className={`btn small ${compare ? 'on' : ''}`}
                onClick={() => setCompare((v) => !v)}
                aria-pressed={compare}
                data-testid="compare-btn"
              >
                {compare ? '효과 다시 보기' : '원본과 비교'}
              </button>
            )}
          </section>

          <section className="block">
            <h2>템플릿</h2>
            <div className="chips" role="radiogroup" aria-label="템플릿">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  role="radio"
                  aria-checked={template === t.id}
                  className={`chip ${template === t.id ? 'on' : ''} ${t.id === 'fourcut' ? 'wide' : ''}`}
                  onClick={() => pickTemplate(t.id)}
                >
                  <strong>{t.name}</strong>
                  <span>{t.hint}</span>
                </button>
              ))}
            </div>
            {template === 'fourcut' && (
              <div className="frame-picker">
                <div className="set-tabs" role="tablist" aria-label="프레임 세트">
                  {FRAME_SETS.map((st) => (
                    <button
                      key={st.id}
                      role="tab"
                      aria-selected={frameSet === st.id}
                      className={`set-tab ${frameSet === st.id ? 'on' : ''}`}
                      onClick={() => setFrameSet(st.id)}
                      data-testid={`set-${st.id}`}
                    >
                      {st.name}
                      {st.isNew && <span className="badge">NEW</span>}
                    </button>
                  ))}
                </div>
                {FRAME_SETS.filter((st) => st.id === frameSet).map((st) => (
                  <div key={st.id} className="frames" role="radiogroup" aria-label={`${st.name} 프레임`}>
                    {st.frames.map((f) => (
                      <button
                        key={f.id}
                        role="radio"
                        aria-checked={frame === f.id}
                        aria-label={f.name}
                        className={`frame-opt ${frame === f.id ? 'on' : ''}`}
                        onClick={() => setFrame(f.id)}
                        data-testid={`frame-${f.id}`}
                      >
                        <img src={frameSwatch(f)} alt="" className="swatch" />
                        <span>{f.name}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div className="seg" role="radiogroup" aria-label="비율">
              {(['9:16', '1:1'] as Ratio[]).map((r) => (
                <button key={r} role="radio" aria-checked={ratio === r} className={ratio === r ? 'on' : ''} onClick={() => setRatio(r)}>
                  {r === '9:16' ? '스토리 9:16' : '정사각 1:1'}
                </button>
              ))}
            </div>
          </section>

          <section className="block">
            <div className="block-head">
              <h2>색감</h2>
              {!neutral && (
                <button className="link-btn" onClick={() => pickPreset('none')} data-testid="reset-adjust">
                  원래대로
                </button>
              )}
            </div>
            <div className="presets" role="radiogroup" aria-label="색감 프리셋">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  role="radio"
                  aria-checked={preset === p.id}
                  className={`preset ${preset === p.id ? 'on' : ''}`}
                  onClick={() => pickPreset(p.id)}
                  data-testid={`preset-${p.id}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <button
              className="btn small"
              onClick={() => setShowSliders((v) => !v)}
              aria-expanded={showSliders}
              data-testid="toggle-sliders"
            >
              {showSliders ? '직접 조절 닫기' : '직접 조절하기'}
            </button>
            {showSliders && (
              <div className="sliders">
                {SLIDERS.map((sl) => (
                  <label key={sl.key} className="range">
                    <span>
                      {sl.name} <b>{adjust[sl.key] > 0 && sl.min < 0 ? `+${adjust[sl.key]}` : adjust[sl.key]}</b>
                    </span>
                    <input
                      id={`adj-${sl.key}`}
                      type="range"
                      min={sl.min}
                      max={sl.max}
                      step={1}
                      value={adjust[sl.key]}
                      onChange={(e) => slide(sl.key, Number(e.target.value))}
                      onDoubleClick={() => slide(sl.key, 0)}
                    />
                  </label>
                ))}
              </div>
            )}
            <p className="fineprint">기록 안의 사진 전체에 같은 색감이 들어가요. 저장된 사진은 바뀌지 않아요.</p>
          </section>

          <section className="block">
            <h2>레트로 필터</h2>
            <label className="toggle">
              <input
                type="checkbox"
                checked={retro}
                onChange={(e) => {
                  setRetro(e.target.checked);
                  setFilterTouched(true);
                }}
                data-testid="retro-toggle"
              />
              <span>옛날 폰 사진 느낌</span>
            </label>
            {retro && (
              <label className="range">
                <span>강도 {strength}</span>
                <input id="strength" type="range" min={10} max={100} step={5} value={strength} onChange={(e) => setStrength(Number(e.target.value))} />
              </label>
            )}
            <p className="fineprint">필터는 그릴 때만 입혀요. 저장된 사진은 바뀌지 않아요. 실제 옛날 폰 카메라를 재현한 게 아니라 그 느낌을 흉내 낸 효과예요.</p>
          </section>

          <section className="block form">
            <label>
              <span>날짜</span>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setDate(e.target.value);
                  setDateTouched(true);
                  setDateHint('');
                }}
              />
            </label>
            {dateHint && <p className="fineprint">{dateHint}</p>}
            <label>
              <span>제목</span>
              <input id="title" type="text" maxLength={40} placeholder="예: 비 오는 날 카페" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label>
              <span>
                한 줄 기록 <em className="muted">{text.length}/300</em>
              </span>
              <textarea id="text" maxLength={300} rows={3} placeholder="오늘 기억하고 싶은 순간" value={text} onChange={(e) => setText(e.target.value)} />
            </label>
          </section>
        </>
      )}

      <div className="bottom-bar">
        <button className="btn primary wide" onClick={save} disabled={!photos.length || saving || !!busy} data-testid="save-record">
          {saving ? '저장 중…' : photos.length ? '저장하기' : '사진을 먼저 골라 주세요'}
        </button>
      </div>
    </div>
  );
}
