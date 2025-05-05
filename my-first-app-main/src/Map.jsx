import React, { useEffect, useState } from 'react';
import './Map.css';

const { kakao } = window;

const Map = () => {
  const [map, setMap] = useState(null);
  const [pointObj, setPointObj] = useState({
    startPoint: { marker: null, lat: null, lng: null },
    endPoint: { marker: null, lat: null, lng: null }
  });
  const [polyline, setPolyline] = useState(null);
  const [isSettingStart, setIsSettingStart] = useState(false);
  const [isSettingEnd, setIsSettingEnd] = useState(false);

  // 지도 초기화
  useEffect(() => {
    const mapContainer = document.getElementById('map');
    const mapOptions = {
      center: new kakao.maps.LatLng(35.1575, 126.8476), // 광주 동구 중심 좌표
      level: 3 // 지도의 확대 레벨
    };

    const kakaoMap = new kakao.maps.Map(mapContainer, mapOptions);

    // 지도 클릭 이벤트 등록
    kakao.maps.event.addListener(kakaoMap, 'click', function (mouseEvent) {
      // 클릭한 위도, 경도 정보를 가져옵니다
      const latlng = mouseEvent.latLng;

      if (isSettingStart) {
        setPoint({ lat: latlng.getLat(), lng: latlng.getLng() }, 'startPoint');
        setIsSettingStart(false);
      } else if (isSettingEnd) {
        setPoint({ lat: latlng.getLat(), lng: latlng.getLng() }, 'endPoint');
        setIsSettingEnd(false);
      }
    });

    setMap(kakaoMap);
  }, [isSettingStart, isSettingEnd]);

  // pointObj가 변경될 때마다 마커 업데이트
  useEffect(() => {
    if (!map) return;

    for (const point in pointObj) {
      if (pointObj[point].marker) {
        pointObj[point].marker.setMap(map);
      }
    }
  }, [pointObj, map]);

  // 지도 중심 부드럽게 이동
  function panTo({ lat, lng }) {
    if (!map) return;

    const moveLatLon = new kakao.maps.LatLng(lat, lng);
    map.panTo(moveLatLon);
  }

  // 출발지 또는 목적지 설정
  function setPoint({ lat, lng }, pointType) {
    if (!map) return;

    // 지도 중심 이동하지 않음 (이 부분 제거)
    // panTo({ lat, lng });

    // 마커 이미지 설정 (출발지는 파란색, 목적지는 빨간색)
    const imageSrc = pointType === 'startPoint'
      ? '//t1.daumcdn.net/localimg/localimages/07/mapapidoc/red_b.png'
      : '//t1.daumcdn.net/localimg/localimages/07/mapapidoc/blue_b.png';
    const imageSize = new kakao.maps.Size(50, 45);
    const imageOption = { offset: new kakao.maps.Point(15, 43) };
    const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);

    // 선택한 위치에 마커 생성
    let marker = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(lat, lng),
      image: markerImage
    });

    setPointObj(prev => {
      // 기존 마커가 있으면 제거
      if (prev[pointType].marker !== null) {
        prev[pointType].marker.setMap(null);
      }
      return { ...prev, [pointType]: { marker, lat, lng } };
    });

    // 기존 경로가 있다면 제거
    if (polyline) {
      polyline.setMap(null);
      setPolyline(null);
    }
  }

  // 카카오 모빌리티 API를 사용하여 자동차 경로 가져오기
  async function getCarDirection() {
    if (!map) return;
    if (!pointObj.startPoint.lat || !pointObj.endPoint.lat) {
      alert('출발지와 목적지를 모두 설정해주세요.');
      return;
    }

    try {
      // REST API 키 (실제 서비스에서는 서버에서 관리해야 합니다)
      const REST_API_KEY = 'c4fa2431a373bfca8080c7097bdb99ee';
      const url = 'https://apis-navi.kakaomobility.com/v1/directions';

      // 출발지와 목적지 좌표 준비
      const origin = `${pointObj.startPoint.lng},${pointObj.startPoint.lat}`;
      const destination = `${pointObj.endPoint.lng},${pointObj.endPoint.lat}`;

      // API 요청 헤더
      const headers = {
        Authorization: `KakaoAK ${REST_API_KEY}`,
        'Content-Type': 'application/json'
      };

      // 쿼리 파라미터 설정
      const queryParams = new URLSearchParams({
        origin: origin,
        destination: destination
      });

      const requestUrl = `${url}?${queryParams}`;

      // API 요청
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      // 테스트 목적으로 콘솔에 응답 데이터 출력
      console.log('API 응답 데이터:', data);

      // 경로를 위한 좌표 배열 생성
      const linePath = [];

      // API 응답에서 경로 좌표 추출
      data.routes[0].sections[0].roads.forEach(road => {
        road.vertexes.forEach((vertex, index) => {
          if (index % 2 === 0) {
            linePath.push(new kakao.maps.LatLng(road.vertexes[index + 1], road.vertexes[index]));
          }
        });
      });

      // 기존 폴리라인 제거
      if (polyline) {
        polyline.setMap(null);
      }

      // 새 폴리라인 생성
      const newPolyline = new kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 5,
        strokeColor: '#0000FF', // 파란색
        strokeOpacity: 0.7,
        strokeStyle: 'solid'
      });

      // 지도에 폴리라인 표시
      newPolyline.setMap(map);
      setPolyline(newPolyline);

      // 경로가 모두 보이도록 지도 영역 조정
      const bounds = new kakao.maps.LatLngBounds();
      linePath.forEach(point => bounds.extend(point));
      map.setBounds(bounds);

    } catch (error) {
      console.error('경로 가져오기 오류:', error);

      // API 호출 실패 시 직선 경로로 대체 (테스트용)
      showStraightRoute();
    }
  }

  // 직선 경로 표시 (API 호출 실패 시 폴백 또는 테스트용)
  function showStraightRoute() {
    if (!map || !pointObj.startPoint.lat || !pointObj.endPoint.lat) {
      alert('출발지와 목적지를 모두 설정해주세요.');
      return;
    }

    // 기존 경로가 있으면 제거
    if (polyline) {
      polyline.setMap(null);
    }

    // 출발지와 목적지 사이의 직선 경로
    const linePath = [
      new kakao.maps.LatLng(pointObj.startPoint.lat, pointObj.startPoint.lng),
      new kakao.maps.LatLng(pointObj.endPoint.lat, pointObj.endPoint.lng)
    ];

    // 새 폴리라인 생성
    const newPolyline = new kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 5,
      strokeColor: '#FF0000', // 테스트용 직선은 빨간색으로 구분
      strokeOpacity: 0.7,
      strokeStyle: 'solid'
    });

    // 지도에 폴리라인 표시
    newPolyline.setMap(map);
    setPolyline(newPolyline);

    // 모든 마커와 경로가 보이도록 지도 영역 조정
    const bounds = new kakao.maps.LatLngBounds();
    bounds.extend(new kakao.maps.LatLng(pointObj.startPoint.lat, pointObj.startPoint.lng));
    bounds.extend(new kakao.maps.LatLng(pointObj.endPoint.lat, pointObj.endPoint.lng));
    map.setBounds(bounds);
  }

  // 샘플 위치 데이터
  const sampleLocations = [
    { name: '광주 동구청', lat: 35.1458, lng: 126.9236 },
    { name: '국립아시아문화전당', lat: 35.1398, lng: 126.9175 },
    { name: '충장로 상점가', lat: 35.1489, lng: 126.9138 },
    { name: '5·18 민주광장', lat: 35.1474, lng: 126.9141 }
  ];

  return (
    <div className="map-container">
      <div className="control-panel">
        <h2>경로 검색</h2>

        <div className="map-selection">
          <h3>지도에서 직접 선택</h3>
          <div className="button-group">
            <button
              className={`selection-button ${isSettingStart ? 'active' : ''}`}
              onClick={() => {
                setIsSettingStart(true);
                setIsSettingEnd(false);
              }}
            >
              출발지 선택
            </button>
            <button
              className={`selection-button ${isSettingEnd ? 'active' : ''}`}
              onClick={() => {
                setIsSettingEnd(true);
                setIsSettingStart(false);
              }}
            >
              목적지 선택
            </button>
          </div>
          {(isSettingStart || isSettingEnd) && (
            <div className="selection-instruction">
              지도에서 {isSettingStart ? '출발지' : '목적지'}를 클릭하세요
            </div>
          )}
        </div>

        <div className="location-buttons">
          <h3>추천 출발지</h3>
          {sampleLocations.map((location, index) => (
            <button
              key={`start-${index}`}
              onClick={() => setPoint({ lat: location.lat, lng: location.lng }, 'startPoint')}
            >
              {location.name}
            </button>
          ))}
        </div>

        <div className="location-buttons">
          <h3>추천 목적지</h3>
          {sampleLocations.map((location, index) => (
            <button
              key={`end-${index}`}
              onClick={() => setPoint({ lat: location.lat, lng: location.lng }, 'endPoint')}
            >
              {location.name}
            </button>
          ))}
        </div>

        <div className="action-buttons">
          <button
            className="route-button"
            onClick={getCarDirection}
            disabled={!pointObj.startPoint.lat || !pointObj.endPoint.lat}
          >
            자동차 경로 검색
          </button>

          <button
            className="test-button"
            onClick={showStraightRoute}
            disabled={!pointObj.startPoint.lat || !pointObj.endPoint.lat}
          >
            직선 경로 보기 (테스트)
          </button>

          {polyline && (
            <button
              className="reset-button"
              onClick={() => {
                if (polyline) {
                  polyline.setMap(null);
                  setPolyline(null);
                }
              }}
            >
              경로 초기화
            </button>
          )}
        </div>
      </div>
      <div id="map" className="map"></div>
    </div>
  );
};

export default Map;