/**
 * 애플리케이션의 메인 컴포넌트
 * - 페이지 상태 관리 및 전환 로직 구현
 * - 시작 페이지, 메인 메뉴, 경로 검색 페이지 간의 흐름 관리
 */
import './App.css';
import { useRef, useState, forwardRef } from 'react';
import Map from './Map'; // Map 컴포넌트 import

function App() {
  // 경로 검색 페이지 표시 상태 (true: 경로 검색 페이지, false: 시작/메인 페이지)
  const [showRouteSearch, setShowRouteSearch] = useState(false);
  // 메인 페이지로 스크롤하기 위한 ref
  const mainRef = useRef(null);

  // 메인 페이지로 부드럽게 스크롤하는 함수
  const scrollToMain = () => {
    mainRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 경로 검색 페이지로 전환하는 함수
  const showRouteSearchPage = () => {
    setShowRouteSearch(true);
  };

  // 메인 페이지로 돌아가는 함수
  const goBackToMain = () => {
    setShowRouteSearch(false);
  };

  return (
    <div>
      {/* 시작 페이지 (경로 검색 페이지가 아닐 때만 표시) */}
      {!showRouteSearch && <Start onStartClick={scrollToMain} />}

      {/* 메인 메뉴 페이지 (경로 검색 페이지가 아닐 때만 표시) */}
      {!showRouteSearch && <Main ref={mainRef} onRouteSearchClick={showRouteSearchPage} />}

      {/* 경로 검색 페이지 (경로 검색 페이지일 때만 표시) */}
      {showRouteSearch && <RouteSearch onBack={goBackToMain} />}
    </div>
  );
}

/**
 * 시작 페이지 컴포넌트
 * - 앱 타이틀, 설명 및 시작하기 버튼 표시
 * - 시작하기 버튼 클릭 시 메인 페이지로 스크롤
 */
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

/**
 * 메인 메뉴 페이지 컴포넌트
 * - 그리드 형태의 메뉴 옵션 제공
 * - forwardRef를 사용하여 부모 컴포넌트에서 참조 가능
 */
const Main = forwardRef(({ onRouteSearchClick }, ref) => {
  return (
    <div className='main' ref={ref}>
      <div className="grid-container">
        {/* 경로 검색 메뉴 항목 */}
        <div className="grid-item item1" onClick={onRouteSearchClick}>경로검색</div>

        {/* 다른 메뉴 항목들 (아직 구현되지 않음) */}
        <div className="grid-item item2">AI 일정</div>
        <div className="grid-item item3">???</div>
        <div className="grid-item item4">게시판</div>
      </div>
    </div>
  );
});

/**
 * 경로 검색 페이지 컴포넌트
 * - 헤더와 뒤로가기 버튼 포함
 * - Map 컴포넌트를 렌더링하여 지도 기능 제공
 */
function RouteSearch({ onBack }) {
  return (
    <div className='route-search'>
      <div className="header">
        <button className="back-button" onClick={onBack}>⬅ 뒤로가기</button>
        <h1>경로 검색</h1>
      </div>
      <Map /> {/* Map 컴포넌트 사용 - 지도 및 경로 검색 기능 제공 */}
    </div>
  );
}

export default App;