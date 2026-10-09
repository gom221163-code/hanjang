import { useEffect, useState } from 'react';
import { Editor } from './ui/Editor';
import { Home, MonthlyEditor, Onboarding, RecordView, Settings } from './ui/screens';
import { todayStr } from './ui/common';

type Screen =
  | { name: 'onboard' }
  | { name: 'home' }
  | { name: 'editor'; id?: string }
  | { name: 'view'; id: string }
  | { name: 'monthly' }
  | { name: 'settings' };

const ONBOARD_KEY = 'hanjang.onboarded';

function seenOnboarding() {
  try {
    return localStorage.getItem(ONBOARD_KEY) === '1';
  } catch {
    return false;
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => (seenOnboarding() ? { name: 'home' } : { name: 'onboard' }));
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [homeKey, setHomeKey] = useState(0);

  // 폰의 뒤로 가기 제스처로 앱 밖으로 튕기지 않도록 화면 이동을 기록한다
  useEffect(() => {
    history.replaceState({ s: { name: 'home' } }, '');
    const onPop = (e: PopStateEvent) => {
      const s = (e.state?.s as Screen | undefined) ?? { name: 'home' };
      setScreen(s);
      if (s.name === 'home') setHomeKey((k) => k + 1);
    };
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  function go(s: Screen, replace = false) {
    if (replace) history.replaceState({ s }, '');
    else history.pushState({ s }, '');
    setScreen(s);
    window.scrollTo(0, 0);
  }
  function home() {
    history.replaceState({ s: { name: 'home' } }, '');
    setScreen({ name: 'home' });
    setHomeKey((k) => k + 1);
    window.scrollTo(0, 0);
  }
  const back = () => history.back();

  switch (screen.name) {
    case 'onboard':
      return (
        <Onboarding
          onStart={() => {
            try {
              localStorage.setItem(ONBOARD_KEY, '1');
            } catch {
              /* 저장 못 해도 계속 진행 */
            }
            go({ name: 'editor' });
          }}
        />
      );
    case 'editor':
      return (
        <Editor
          key={screen.id ?? 'new'}
          recordId={screen.id}
          onBack={back}
          onSaved={(id) => go({ name: 'view', id }, true)}
        />
      );
    case 'view':
      return <RecordView key={screen.id} id={screen.id} onBack={home} onEdit={() => go({ name: 'editor', id: screen.id })} onDeleted={home} />;
    case 'monthly':
      return <MonthlyEditor month={month} onBack={back} onNew={() => go({ name: 'editor' })} />;
    case 'settings':
      return <Settings onBack={back} onCleared={home} />;
    default:
      return (
        <Home
          key={homeKey}
          month={month}
          setMonth={setMonth}
          onNew={() => go({ name: 'editor' })}
          onOpen={(id) => go({ name: 'view', id })}
          onMonthly={() => go({ name: 'monthly' })}
          onSettings={() => go({ name: 'settings' })}
        />
      );
  }
}
