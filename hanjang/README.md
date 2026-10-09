# 한 장 · 사진 다이어리

사진 고르고 한 줄 쓰면 기록 카드가 완성되고, 월말엔 기록을 모아 한 장짜리 월간 다이어리를 만드는 웹 앱이에요.
사진은 서버로 보내지 않고 휴대폰 브라우저 안에서만 처리·저장해요. 유료 서비스는 하나도 쓰지 않아요.

---

## 1. 내 컴퓨터에서 실행하기 (Windows)

### 처음 한 번만: 준비물 설치

1. **Node.js 설치**: https://nodejs.org 에서 **LTS** 버전을 받아 설치해요. 설치 중 선택지는 모두 기본값으로 두면 돼요.
2. **Git 설치**: https://git-scm.com/download/win 에서 받아 설치해요. 역시 기본값으로 두면 돼요.
3. 설치가 끝나면 **PowerShell을 완전히 껐다가 다시 열어요.** (그래야 새로 설치한 프로그램을 인식해요)
4. 잘 설치됐는지 확인:

```powershell
node -v
npm -v
git --version
```

숫자(버전)가 나오면 성공이에요. `node -v`는 **v18 이상**이어야 해요.

### 실행

압축을 푼 `hanjang` 폴더로 이동한 뒤 실행해요. (아래 경로는 예시예요. 실제로 압축을 푼 위치로 바꿔 주세요)

```powershell
cd C:\Users\내이름\Desktop\hanjang
npm install
npm run dev
```

- `npm install`은 처음 한 번만 하면 돼요. 1~3분 걸릴 수 있어요.
- `npm run dev`를 실행하면 `http://localhost:5173` 같은 주소가 나와요. 크롬에서 그 주소를 열면 앱이 보여요.
- 끝낼 때는 PowerShell에서 `Ctrl + C`를 눌러요.

### 휴대폰으로 미리 보기 (같은 와이파이일 때)

```powershell
npm run dev -- --host
```

`Network: http://192.168.x.x:5173` 주소가 나오면 휴대폰 브라우저에서 그 주소를 열어요.
단, 이 방식은 https가 아니라서 **공유하기 버튼 등 일부 기능이 휴대폰에서 동작하지 않을 수 있어요.** 제대로 된 휴대폰 테스트는 아래 Vercel 배포 후 링크로 해 주세요.

---

## 2. 무료로 배포하기 (GitHub + Vercel)

배포하면 `https://hanjang-xxxx.vercel.app` 같은 링크가 생기고, 친구들이 그 링크로 바로 쓸 수 있어요. 둘 다 무료 플랜으로 충분해요.

### 2-1. GitHub에 올리기

1. https://github.com 에서 회원가입해요. (직접 하셔야 해요)
2. 오른쪽 위 `+` → **New repository** → 이름에 `hanjang` 입력 → **Public 또는 Private** 선택 → 아래 체크박스는 모두 비워 두고 **Create repository**.
3. PowerShell에서 프로젝트 폴더로 이동한 뒤 아래를 한 줄씩 실행해요. `내아이디`는 본인 GitHub 아이디로 바꿔요.

```powershell
git init
git add .
git commit -m "첫 버전"
git branch -M main
git remote add origin https://github.com/내아이디/hanjang.git
git push -u origin main
```

처음 `git push`를 하면 GitHub 로그인 창이 떠요. 로그인하면 업로드돼요.

### 2-2. Vercel에 연결하기

1. https://vercel.com 에서 **Continue with GitHub**로 가입해요. (Hobby, 무료 플랜 선택)
2. **Add New → Project** → 방금 올린 `hanjang` 저장소 옆 **Import**.
3. 설정은 건드리지 않아도 돼요. Vercel이 Vite 프로젝트를 자동으로 알아봐요.
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Deploy** → 1~2분 뒤 링크가 생겨요.

### 2-3. 수정한 내용 다시 배포하기

코드를 고친 뒤 아래만 실행하면 Vercel이 자동으로 새 버전을 배포해요.

```powershell
git add .
git commit -m "무엇을 고쳤는지 짧게"
git push
```

---

## 3. 자주 나는 오류와 해결 방법

| 오류 메시지 | 원인 | 해결 |
|---|---|---|
| `'npm'은(는) 내부 또는 외부 명령...이 아닙니다` / `npm : 용어가 ... 인식되지 않습니다` | Node.js가 설치 안 됐거나 PowerShell을 다시 안 켬 | Node.js 설치 후 PowerShell을 껐다 켜기 |
| `이 시스템에서 스크립트를 실행할 수 없으므로 ... npm.ps1 파일을 로드할 수 없습니다` | Windows 보안 설정이 막음 | PowerShell에서 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` 실행 후 `Y` 입력. 그래도 안 되면 `npm.cmd install`, `npm.cmd run dev`처럼 `.cmd`를 붙여서 실행 |
| `ENOENT: no such file or directory, open '...package.json'` | 프로젝트 폴더가 아닌 곳에서 실행 | `cd`로 `package.json`이 있는 `hanjang` 폴더로 이동. `dir`을 쳐서 `package.json`이 보이는지 확인 |
| `Port 5173 is in use` | 이미 다른 창에서 실행 중 | 다른 PowerShell 창의 실행을 `Ctrl + C`로 끄거나, 그냥 새로 나온 다른 주소(5174 등)로 접속 |
| `git push`에서 `rejected` 또는 `failed to push` | GitHub 저장소를 만들 때 README 등을 같이 만듦 | `git pull origin main --allow-unrelated-histories` 실행 후 다시 `git push` |
| `'git'은(는) ... 아닙니다` | Git이 설치 안 됨 | Git 설치 후 PowerShell 다시 열기 |
| Vercel 배포 실패 (`Build failed`) | 코드 오류 | 내 컴퓨터에서 `npm run build`를 먼저 실행해 보고, 나온 오류 메시지를 그대로 복사해서 Claude에게 물어보기 |

오류가 나면 **PowerShell에 나온 빨간 글씨를 전부 복사해서** 물어보는 게 가장 빨라요.

---

## 4. 폴더 구조 (어디를 고치면 되는지)

```
src/
  App.tsx            화면 이동
  ui/
    screens.tsx      홈, 기록 보기, 월간 다이어리, 저장 공간 화면, 안내 문구
    Editor.tsx       기록 만들기·수정 화면
    ShareSheet.tsx   저장·공유 화면
  render/
    record.ts        기록 카드 템플릿 4개 디자인 (미리보기와 저장 이미지 공통)
    monthly.ts       월간 다이어리 디자인 (기록 수별 배치)
    draw.ts          레트로 필터, 사진 자르기, 글자 줄바꿈
  storage/
    db.ts            저장 기능 (IndexedDB). 나중에 서버로 바꿀 때 이 파일만 교체
  lib/
    image.ts         사진 줄이기, 촬영일 읽기
    share.ts         공유, 이미지 저장, 링크 복사
```

- 앱 이름 바꾸기: `src/render/record.ts`의 `APP_NAME`, `index.html`의 `<title>`, `public/manifest.webmanifest`
- 안내 문구 바꾸기: `src/ui/screens.tsx`의 `DataNotice`

---

## 5. 저장 방식과 한계 (사용자에게도 안내됨)

- 원본 사진이 아니라 **긴 변 최대 2048px로 줄인 사진**과 목록용 작은 사진(720px)만 저장해요. 원본은 사진첩에 그대로 있어요.
- 레트로 필터는 **그릴 때만** 입혀요. 저장된 사진은 바뀌지 않아요.
- 같은 사진을 여러 기록에 써도 한 번만 저장돼요. 기록을 지우거나 사진을 빼면 더 이상 안 쓰는 사진은 같이 정리돼요.
- 사진 축소나 저장 중 오류가 나면 저장을 통째로 취소해서 기존 기록은 그대로 남아요.
- 데이터는 이 브라우저 안에만 있어요. 브라우저 데이터 삭제, 기기 변경, 브라우저의 저장 공간 정리 시 사라질 수 있고, 홈 화면에 추가해도 영구 보존이 보장되지 않아요.
