// 미리보기 링크용 진입점: 글꼴은 Google Fonts에서 불러온다 (npm 글꼴 파일 대신)
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
