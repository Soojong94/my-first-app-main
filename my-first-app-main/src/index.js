/**
 * 애플리케이션 진입점
 * - React 앱을 초기화하고 DOM에 렌더링하는 역할
 * - React StrictMode를 사용하여 개발 중 잠재적 문제 감지
 * - 웹 바이탈 측정을 위한 reportWebVitals 설정
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// React 18의 createRoot API를 사용하여 렌더링
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 성능 측정을 위한 웹 바이탈 보고 (선택 사항)
reportWebVitals();