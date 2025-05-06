import React, { useEffect, useState, useRef } from 'react';
import './Map.css';

// 카카오 지도 SDK를 전역 객체로부터 가져옴
// 중요: 이 코드가 실행되기 전에 index.html에서 카카오 맵 SDK가 먼저 로드되어 있어야 함
// <script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey=여기에_발급받은_JavaScript_API_키_입력&libraries=services,clusterer,drawing"></script>
const { kakao } = window;

const Map = () => {
  // 지도 객체를 DOM 외부에서도 참조하기 위한 useRef 설정
  // useRef는 값이 변경되어도 컴포넌트가 리렌더링되지 않음
  const mapRef = useRef(null);

  // 지도 객체를 상태로 관리 (리렌더링 발생시 활용)
  const [map, setMap] = useState(null);

  // 출발지와 목적지의 정보를 관리하는 상태
  // marker: 지도 위에 표시되는 마커 객체
  // lat, lng: 위도와 경도 값
  const [pointObj, setPointObj] = useState({
    startPoint: { marker: null, lat: null, lng: null },
    endPoint: { marker: null, lat: null, lng: null }
  });

  // 경로를 표시하는 폴리라인 객체를 저장하는 상태
  const [polyline, setPolyline] = useState(null);

  // 장소 검색 입력값을 저장하는 상태
  const [searchKeyword, setSearchKeyword] = useState('');

  // 검색 결과 목록을 저장하는 상태
  const [searchResults, setSearchResults] = useState([]);

  // 검색 진행 중인지 여부를 나타내는 상태 (로딩 인디케이터 표시 용도)
  const [searching, setSearching] = useState(false);

  // 컴포넌트가 마운트될 때 지도 초기화 - 의존성 배열이 비어있어 최초 1회만 실행
  useEffect(() => {
    // 지도를 표시할 DOM 요소 가져오기
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return; // 요소가 없으면 함수 종료

    // 지도 생성 옵션 설정
    const mapOptions = {
      center: new kakao.maps.LatLng(35.1575, 126.8476), // 중심 좌표로 초기화
      level: 3 // 지도 확대 레벨 (1~14, 숫자가 작을수록 더 확대됨)
    };

    // 지도 객체 생성 - 카카오맵 API의 핵심 객체
    const kakaoMap = new kakao.maps.Map(mapContainer, mapOptions);

    // 확대/축소 컨트롤 추가 - 사용자가 지도 레벨을 쉽게 조절할 수 있게 함
    const zoomControl = new kakao.maps.ZoomControl();
    kakaoMap.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

    // 생성된 지도 객체를 상태와 ref 모두에 저장
    // useState: 리렌더링 트리거 용도
    // useRef: 컴포넌트 함수 외부에서도 최신 지도 객체에 접근하기 위한 용도
    setMap(kakaoMap);
    mapRef.current = kakaoMap;
  }, []); // 빈 의존성 배열: 컴포넌트 마운트 시 한 번만 실행

  // pointObj 상태가 변경될 때마다 마커 업데이트
  useEffect(() => {
    if (!map) return; // 지도가 아직 로드되지 않았으면 함수 종료

    // pointObj 내의 모든 포인트(출발지, 목적지)에 대해 반복
    for (const point in pointObj) {
      // 해당 포인트에 마커가 있으면 지도에 표시
      if (pointObj[point].marker) {
        pointObj[point].marker.setMap(map);
      }
    }
  }, [pointObj, map]); // pointObj 또는 map이 변경될 때마다 실행

  // 키워드로 장소 검색 함수
  const searchPlaces = () => {
    // 지도가 로드되지 않았거나 검색어가 비어있으면 alert 표시 후 종료
    if (!map || !searchKeyword.trim()) {
      alert('검색어를 입력하세요!');
      return;
    }

    // 검색 상태 업데이트 및 이전 검색 결과 초기화
    setSearching(true);
    setSearchResults([]);

    // 카카오 장소 검색 서비스 객체 생성
    // 중요: 이 기능을 사용하려면 SDK 로드 시 libraries 파라미터에 'services' 포함 필요
    const places = new kakao.maps.services.Places();

    // 키워드로 장소 검색 API 호출
    // 첫 번째 파라미터: 검색할 키워드
    // 두 번째 파라미터: 콜백 함수 (검색 결과와 상태를 받음)
    places.keywordSearch(searchKeyword, (result, status) => {
      if (status === kakao.maps.services.Status.OK) {
        // 검색 성공 시 결과를 상태에 저장
        console.log('검색 결과:', result);
        setSearchResults(result);
      } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
        // 검색 결과가 없을 때 알림
        alert('검색 결과가 존재하지 않습니다.');
      } else if (status === kakao.maps.services.Status.ERROR) {
        // 검색 중 오류 발생 시 알림
        alert('검색 중 오류가 발생했습니다.');
      }
      // 검색 상태 종료 (로딩 인디케이터 제거)
      setSearching(false);
    });
  };

  // 검색 결과 항목 클릭 시 해당 위치로 지도 이동
  const moveToPlace = (place) => {
    // place 객체에서 위도(y)와 경도(x) 값을 추출하여 숫자로 변환
    const lat = parseFloat(place.y);
    const lng = parseFloat(place.x);

    // 추출한 좌표로 지도 이동
    panTo({ lat, lng });
  };

  // 검색 결과를 출발지 또는 목적지로 설정
  const selectSearchResult = (place, pointType) => {
    // place 객체에서 위도(y)와 경도(x) 값을 추출하여 숫자로 변환
    const lat = parseFloat(place.y);
    const lng = parseFloat(place.x);

    // 해당 위치를 출발지 또는 목적지로 설정 (마커 표시)
    setPoint({ lat, lng }, pointType);

    // 선택한 위치로 지도 중심 이동
    panTo({ lat, lng });
  };

  // 지도 중심을 부드럽게 특정 위치로 이동시키는 함수
  function panTo({ lat, lng }) {
    if (!mapRef.current) return; // 지도가 로드되지 않았으면 함수 종료

    // 이동할 위치의 LatLng 객체 생성
    const moveLatLon = new kakao.maps.LatLng(lat, lng);

    // 지도 중심을 부드럽게 이동 (애니메이션 효과)
    // panTo는 카카오맵 API의 메서드로, 현재 위치에서 목표 위치까지 부드럽게 이동
    mapRef.current.panTo(moveLatLon);
  }

  // 출발지 또는 목적지 위치를 설정하고 마커 표시하는 함수
  function setPoint({ lat, lng }, pointType) {
    if (!mapRef.current) return; // 지도가 로드되지 않았으면 함수 종료

    // 출발지와 목적지에 따라 다른 마커 이미지 사용 (출발지: 빨간색, 목적지: 파란색)
    const imageSrc = pointType === 'startPoint'
      ? '//t1.daumcdn.net/localimg/localimages/07/mapapidoc/red_b.png'
      : '//t1.daumcdn.net/localimg/localimages/07/mapapidoc/blue_b.png';

    // 마커 이미지 크기 설정
    const imageSize = new kakao.maps.Size(50, 45);

    // 마커 이미지의 옵션 - 마커 이미지에서 기준이 되는 좌표 설정
    const imageOption = { offset: new kakao.maps.Point(15, 43) };

    // 마커 이미지 객체 생성
    const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);

    // 새 마커 객체 생성
    let marker = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(lat, lng), // 마커 위치 설정
      image: markerImage // 마커 이미지 설정
    });

    // 기존 마커 제거 후 새 마커로 상태 업데이트
    setPointObj(prev => {
      // 해당 포인트 타입(출발지/목적지)에 기존 마커가 있으면 지도에서 제거
      if (prev[pointType].marker !== null) {
        prev[pointType].marker.setMap(null);
      }
      // 새로운 마커, 위도, 경도 정보로 상태 업데이트 (불변성 유지)
      return { ...prev, [pointType]: { marker, lat, lng } };
    });

    // 기존 경로가 있다면 제거 (새로운 출발지/목적지가 설정되었으므로 기존 경로는 무효화)
    if (polyline) {
      polyline.setMap(null);
      setPolyline(null);
    }
  }

  // 사용자의 현재 위치를 가져와서 출발지로 설정하는 함수
  const getCurrentLocation = () => {
    // 브라우저가 Geolocation API 지원하는지 확인
    if (navigator.geolocation) {
      // 현재 위치 정보 요청
      navigator.geolocation.getCurrentPosition(
        // 위치 정보 가져오기 성공 시 콜백
        (position) => {
          // GeolocationPosition 객체에서 위도와 경도 추출
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // 현재 위치로 지도 이동
          panTo({ lat, lng });

          // 현재 위치를 출발지로 설정
          setPoint({ lat, lng }, 'startPoint');
        },
        // 위치 정보 가져오기 실패 시 콜백
        (error) => {
          console.error('현재 위치 오류:', error);
          alert('현재 위치를 가져오는데 실패했습니다.');
        }
      );
    } else {
      // Geolocation API를 지원하지 않는 브라우저일 경우
      alert('브라우저에서 위치 정보를 지원하지 않습니다.');
    }
  };

  // 카카오 모빌리티 API를 사용하여 자동차 경로를 요청하는 함수
  async function getCarDirection() {
    if (!mapRef.current) return; // 지도가 로드되지 않았으면 함수 종료

    // 출발지와 목적지가 모두 설정되었는지 확인
    if (!pointObj.startPoint.lat || !pointObj.endPoint.lat) {
      alert('출발지와 목적지를 모두 설정해주세요.');
      return;
    }

    try {
      // 카카오 REST API 키 설정
      // 중요: 실제 서비스에서는 보안을 위해 서버에서 API 키를 관리하는 것이 좋음
      // 프론트엔드 코드에 직접 API 키를 포함하면 누구나 볼 수 있어 보안에 취약
      const REST_API_KEY = ''; // 여기에 실제 REST API 키 입력
      const url = 'https://apis-navi.kakaomobility.com/v1/directions';

      // 출발지와 목적지 좌표를 API 요청 형식에 맞게 변환
      // 카카오 API는 'lng,lat' 형식을 사용함에 주의 (일반적인 'lat,lng'과 다름)
      const origin = `${pointObj.startPoint.lng},${pointObj.startPoint.lat}`;
      const destination = `${pointObj.endPoint.lng},${pointObj.endPoint.lat}`;

      // API 요청 헤더 설정 (인증 및 콘텐츠 타입)
      const headers = {
        Authorization: `KakaoAK ${REST_API_KEY}`, // 카카오 API 인증 헤더
        'Content-Type': 'application/json'
      };

      // 요청 URL의 쿼리 파라미터 설정
      const queryParams = new URLSearchParams({
        origin,
        destination
      });
      const requestUrl = `${url}?${queryParams}`;

      // fetch API를 사용하여 HTTP GET 요청 전송
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers
      });

      // 응답 상태 확인 (404, 500 등의 에러 처리)
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      // 응답 데이터를 JSON으로 파싱
      const data = await response.json();

      // 경로를 위한 좌표 배열 생성
      const linePath = [];

      // API 응답에서 경로 좌표 추출
      // 카카오 모빌리티 API가 반환하는 JSON 구조에 맞게 데이터 추출
      data.routes[0].sections[0].roads.forEach(road => {
        // vertexes는 [x1, y1, x2, y2, ...] 형식의 배열이므로 두 개씩 짝지어 처리
        road.vertexes.forEach((vertex, index) => {
          if (index % 2 === 0) {
            // 짝수 인덱스면 x(경도), 다음 값은 y(위도)
            // 카카오맵은 LatLng 객체에 (위도, 경도) 순서로 입력해야 함
            linePath.push(new kakao.maps.LatLng(road.vertexes[index + 1], road.vertexes[index]));
          }
        });
      });

      // 기존 경로가 있으면 지도에서 제거
      if (polyline) polyline.setMap(null);

      // 새 폴리라인(경로) 객체 생성
      const newPolyline = new kakao.maps.Polyline({
        path: linePath, // 경로 좌표 배열
        strokeWeight: 5, // 선 두께
        strokeColor: '#0000FF', // 선 색상 (파란색)
        strokeOpacity: 0.7, // 선 투명도
        strokeStyle: 'solid' // 선 스타일
      });

      // 지도에 폴리라인 표시
      newPolyline.setMap(mapRef.current);
      setPolyline(newPolyline);

      // 경로가 모두 보이도록 지도의 영역 조정
      const bounds = new kakao.maps.LatLngBounds();
      linePath.forEach(point => bounds.extend(point));
      mapRef.current.setBounds(bounds);

    } catch (error) {
      // API 요청 실패 시 오류 처리
      console.error('경로 가져오기 오류:', error);

      // 오류 발생 시 직선 경로로 대체 표시 (폴백)
      showStraightRoute();
    }
  }

  // API 호출 실패 시 출발지-목적지 간 직선 경로를 표시하는 함수 (폴백)
  function showStraightRoute() {
    // 지도가 로드되지 않았거나 출발지/목적지가 설정되지 않았으면 함수 종료
    if (!mapRef.current || !pointObj.startPoint.lat || !pointObj.endPoint.lat) {
      alert('출발지와 목적지를 모두 설정해주세요.');
      return;
    }

    // 기존 경로가 있으면 지도에서 제거
    if (polyline) {
      polyline.setMap(null);
    }

    // 출발지와 목적지 사이의 직선 경로 좌표 배열 생성
    const linePath = [
      new kakao.maps.LatLng(pointObj.startPoint.lat, pointObj.startPoint.lng),
      new kakao.maps.LatLng(pointObj.endPoint.lat, pointObj.endPoint.lng)
    ];

    // 새 폴리라인 객체 생성
    const newPolyline = new kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 5,
      strokeColor: '#FF0000', // 직선 경로는 빨간색으로 구분 (API 경로는 파란색)
      strokeOpacity: 0.7,
      strokeStyle: 'solid'
    });

    // 지도에 폴리라인 표시
    newPolyline.setMap(mapRef.current);
    setPolyline(newPolyline);

    // 출발지와 목적지가 모두 보이도록 지도의 영역 조정
    const bounds = new kakao.maps.LatLngBounds();
    bounds.extend(linePath[0]);
    bounds.extend(linePath[1]);
    mapRef.current.setBounds(bounds);
  }

  // 모든 마커, 경로, 검색 결과를 초기화하는 함수
  const resetAll = () => {
    // 모든 마커(출발지, 목적지) 제거
    for (const point in pointObj) {
      if (pointObj[point].marker !== null) {
        pointObj[point].marker.setMap(null);
      }
    }

    // 경로 제거
    if (polyline) polyline.setMap(null);

    // 상태 초기화
    setPointObj({
      startPoint: { marker: null, lat: null, lng: null },
      endPoint: { marker: null, lat: null, lng: null }
    });
    setPolyline(null);
    setSearchResults([]);
    setSearchKeyword('');
  };

  // 컴포넌트 UI 렌더링
  return (
    <div className="map-container">
      {/* 지도가 표시될 영역 - 실제 카카오맵이 렌더링됨 */}
      <div id="map" className="map"></div>

      {/* 검색 패널 - 장소 검색 및 경로 제어 기능 */}
      <div className="search-panel">
        <h2>장소 검색</h2>

        {/* 검색 폼 */}
        <div className="search-form">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="장소를 입력하세요"
            onKeyPress={(e) => e.key === 'Enter' && searchPlaces()}
          />
          <button onClick={searchPlaces} disabled={searching}>
            {searching ? '검색 중...' : '검색하기'}
          </button>
        </div>

        {/* 검색 결과 - 결과가 있을 때만 표시 */}
        {searchResults.length > 0 && (
          <div className="search-results">
            <h3>검색 결과</h3>
            <ul>
              {searchResults.map((place, index) => (
                <li key={index}>
                  {/* 장소 정보 (클릭 시 해당 위치로 지도 이동) */}
                  <div className="place-info" onClick={() => moveToPlace(place)}>
                    <strong>{place.place_name}</strong>
                    <p>{place.address_name}</p>
                  </div>
                  {/* 출발지/목적지 설정 버튼 */}
                  <div className="place-actions">
                    <button onClick={() => selectSearchResult(place, 'startPoint')}>
                      출발지로 설정
                    </button>
                    <button onClick={() => selectSearchResult(place, 'endPoint')}>
                      목적지로 설정
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 경로 검색 옵션 */}
        <div className="route-actions">
          <h3>경로 찾기</h3>

          {/* 출발지/목적지 상태 표시 */}
          <div className="location-status">
            <div className="location-point">
              <span className="point-label">출발지:</span>
              <span className="point-value">
                {pointObj.startPoint.lat ? '설정됨' : '미설정'}
              </span>
            </div>

            <div className="location-point">
              <span className="point-label">목적지:</span>
              <span className="point-value">
                {pointObj.endPoint.lat ? '설정됨' : '미설정'}
              </span>
            </div>
          </div>

          {/* 기능 버튼 영역 */}
          <div className="action-buttons">
            {/* 현재 위치 가져오기 버튼 */}
            <button
              className="route-button"
              onClick={getCurrentLocation}
            >
              현재 위치
            </button>

            {/* 경로 찾기 버튼 - 출발지와 목적지가 모두 설정되어야 활성화 */}
            <button
              className="route-button"
              onClick={getCarDirection}
              disabled={!pointObj.startPoint.lat || !pointObj.endPoint.lat}
            >
              경로 찾기
            </button>

            {/* 초기화 버튼 - 모든 마커와 경로 제거 */}
            <button
              className="reset-button"
              onClick={resetAll}
            >
              초기화
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;