import './App.css';
import { useRef, useState, forwardRef } from 'react';
import Map from './Map'; // Map 컴포넌트 import

function App() {
  const [showRouteSearch, setShowRouteSearch] = useState(false);
  const mainRef = useRef(null);

  const scrollToMain = () => {
    mainRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const showRouteSearchPage = () => {
    setShowRouteSearch(true);
  };

  const goBackToMain = () => {
    setShowRouteSearch(false);
  };

  return (
    <div>
      {!showRouteSearch && <Start onStartClick={scrollToMain} />}
      {!showRouteSearch && <Main ref={mainRef} onRouteSearchClick={showRouteSearchPage} />}
      {showRouteSearch && <RouteSearch onBack={goBackToMain} />}
    </div>
  );
}

function Start({ onStartClick }) {
  return (
    <div className='start'>
      <h1 className='title'>Journey Flow</h1>
      <p className='description'>사이트 설명</p>
      <div className="button-wrapper">
        <button onClick={onStartClick}>시작하기</button>
      </div>
    </div>
  );
}

const Main = forwardRef(({ onRouteSearchClick }, ref) => {
  return (
    <div className='main' ref={ref}>
      <div className="grid-container">
        <div className="grid-item item1" onClick={onRouteSearchClick}>경로검색</div>
        <div className="grid-item item2">AI 일정</div>
        <div className="grid-item item3">???</div>
        <div className="grid-item item4">게시판</div>
      </div>
    </div>
  );
});

function RouteSearch({ onBack }) {
  return (
    <div className='route-search'>
      <div className="header">
        <button className="back-button" onClick={onBack}>⬅ 뒤로가기</button>
        <h1>경로 검색</h1>
      </div>
      <Map /> {/* Map 컴포넌트 사용 */}
    </div>
  );
}

export default App;