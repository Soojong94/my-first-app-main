import React, { useEffect, useState, useRef } from 'react';
import './Map.css';

// 카카오 지도 객체 참조
const { kakao } = window;

const Map = () => {
  // 지도 DOM을 참조하기 위한 ref
  const mapRef = useRef(null);

  // 지도 객체 상태
  const [map, setMap] = useState(null);

  // 출발지와 목적지 포인트 정보 (마커, 위도, 경도 포함)
  const [pointObj, setPointObj] = useState({
    startPoint: { marker: null, lat: null, lng: null },
    endPoint: { marker: null, lat: null, lng: null }
  });

  // 지도 위에 표시할 폴리라인(경로) 객체
  const [polyline, setPolyline] = useState(null);

  // 장소 검색어 입력 값
  const [searchKeyword, setSearchKeyword] = useState('');

  // 검색 결과 목록
  const [searchResults, setSearchResults] = useState([]);

  // 검색 중 여부 (로딩 표시용)
  const [searching, setSearching] = useState(false);

  // 컴포넌트가 마운트될 때 지도 초기화
  useEffect(() => {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    const mapOptions = {
      center: new kakao.maps.LatLng(35.1575, 126.8476), // 광주 동구 중심 좌표
      level: 3 // 지도 확대 레벨
    };

    // 지도 객체 생성
    const kakaoMap = new kakao.maps.Map(mapContainer, mapOptions);

    // 확대/축소 컨트롤 추가
    const zoomControl = new kakao.maps.ZoomControl();
    kakaoMap.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

    // 지도 객체 저장
    setMap(kakaoMap);
    mapRef.current = kakaoMap;
  }, []);

  // pointObj가 변경되면 마커를 지도에 표시
  useEffect(() => {
    if (!map) return;

    for (const point in pointObj) {
      if (pointObj[point].marker) {
        pointObj[point].marker.setMap(map);
      }
    }
  }, [pointObj, map]);

  // 키워드로 장소 검색
  const searchPlaces = () => {
    if (!map || !searchKeyword.trim()) {
      alert('검색어를 입력하세요!');
      return;
    }

    setSearching(true);
    setSearchResults([]);

    const places = new kakao.maps.services.Places();

    // 카카오 장소 검색 API 호출
    places.keywordSearch(searchKeyword, (result, status) => {
      if (status === kakao.maps.services.Status.OK) {
        setSearchResults(result);
      } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
        alert('검색 결과가 존재하지 않습니다.');
      } else if (status === kakao.maps.services.Status.ERROR) {
        alert('검색 중 오류가 발생했습니다.');
      }
      setSearching(false);
    });
  };

  // 특정 장소로 지도 이동
  const moveToPlace = (place) => {
    const lat = parseFloat(place.y);
    const lng = parseFloat(place.x);
    panTo({ lat, lng });
  };

  // 검색 결과를 출발지 또는 목적지로 설정
  const selectSearchResult = (place, pointType) => {
    const lat = parseFloat(place.y);
    const lng = parseFloat(place.x);
    setPoint({ lat, lng }, pointType);
    panTo({ lat, lng });
  };

  // 지도의 중심을 부드럽게 이동
  function panTo({ lat, lng }) {
    if (!mapRef.current) return;
    const moveLatLon = new kakao.maps.LatLng(lat, lng);
    mapRef.current.panTo(moveLatLon);
  }

  // 출발지 또는 목적지 위치를 설정하고 마커 표시
  function setPoint({ lat, lng }, pointType) {
    if (!mapRef.current) return;

    // 마커 이미지 (출발지: 빨강 / 목적지: 파랑)
    const imageSrc = pointType === 'startPoint'
      ? '//t1.daumcdn.net/localimg/localimages/07/mapapidoc/red_b.png'
      : '//t1.daumcdn.net/localimg/localimages/07/mapapidoc/blue_b.png';
    const imageSize = new kakao.maps.Size(50, 45);
    const imageOption = { offset: new kakao.maps.Point(15, 43) };
    const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);

    // 새 마커 생성
    let marker = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(lat, lng),
      image: markerImage
    });

    // 기존 마커 제거 후 새 마커로 상태 업데이트
    setPointObj(prev => {
      if (prev[pointType].marker !== null) {
        prev[pointType].marker.setMap(null);
      }
      return { ...prev, [pointType]: { marker, lat, lng } };
    });

    // 기존 경로 제거
    if (polyline) {
      polyline.setMap(null);
      setPolyline(null);
    }
  }

  // 현재 위치를 가져와서 출발지로 설정
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          panTo({ lat, lng });
          setPoint({ lat, lng }, 'startPoint');
        },
        (error) => {
          console.error('현재 위치 오류:', error);
          alert('현재 위치를 가져오는데 실패했습니다.');
        }
      );
    } else {
      alert('브라우저에서 위치 정보를 지원하지 않습니다.');
    }
  };

  // 자동차 경로를 카카오 모빌리티 API로 요청
  async function getCarDirection() {
    if (!mapRef.current) return;
    if (!pointObj.startPoint.lat || !pointObj.endPoint.lat) {
      alert('출발지와 목적지를 모두 설정해주세요.');
      return;
    }

    try {
      const REST_API_KEY = 'c4fa2431a373bfca8080c7097bdb99ee'; // 보안상 서버에서 관리 권장
      const url = 'https://apis-navi.kakaomobility.com/v1/directions';

      const origin = `${pointObj.startPoint.lng},${pointObj.startPoint.lat}`;
      const destination = `${pointObj.endPoint.lng},${pointObj.endPoint.lat}`;

      const headers = {
        Authorization: `KakaoAK ${REST_API_KEY}`,
        'Content-Type': 'application/json'
      };

      const queryParams = new URLSearchParams({ origin, destination });
      const requestUrl = `${url}?${queryParams}`;

      const response = await fetch(requestUrl, { method: 'GET', headers });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.json();

      // 응답에서 경로 좌표 추출
      const linePath = [];
      data.routes[0].sections[0].roads.forEach(road => {
        road.vertexes.forEach((vertex, index) => {
          if (index % 2 === 0) {
            linePath.push(new kakao.maps.LatLng(road.vertexes[index + 1], road.vertexes[index]));
          }
        });
      });

      // 기존 경로 제거 후 새로 생성
      if (polyline) polyline.setMap(null);

      const newPolyline = new kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 5,
        strokeColor: '#0000FF',
        strokeOpacity: 0.7,
        strokeStyle: 'solid'
      });

      newPolyline.setMap(mapRef.current);
      setPolyline(newPolyline);

      // 경로 전체가 보이도록 지도 범위 조정
      const bounds = new kakao.maps.LatLngBounds();
      linePath.forEach(point => bounds.extend(point));
      mapRef.current.setBounds(bounds);

    } catch (error) {
      console.error('경로 가져오기 오류:', error);
      showStraightRoute(); // 오류 시 직선 경로로 대체
    }
  }

  // 직선 경로 그리기 (API 오류 시 대체 경로)
  function showStraightRoute() {
    if (!mapRef.current || !pointObj.startPoint.lat || !pointObj.endPoint.lat) {
      alert('출발지와 목적지를 모두 설정해주세요.');
      return;
    }

    if (polyline) polyline.setMap(null);

    const linePath = [
      new kakao.maps.LatLng(pointObj.startPoint.lat, pointObj.startPoint.lng),
      new kakao.maps.LatLng(pointObj.endPoint.lat, pointObj.endPoint.lng)
    ];

    const newPolyline = new kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 5,
      strokeColor: '#FF0000',
      strokeOpacity: 0.7,
      strokeStyle: 'solid'
    });

    newPolyline.setMap(mapRef.current);
    setPolyline(newPolyline);

    const bounds = new kakao.maps.LatLngBounds();
    bounds.extend(linePath[0]);
    bounds.extend(linePath[1]);
    mapRef.current.setBounds(bounds);
  }

  // 마커, 경로, 상태 모두 초기화
  const resetAll = () => {
    for (const point in pointObj) {
      if (pointObj[point].marker !== null) {
        pointObj[point].marker.setMap(null);
      }
    }

    if (polyline) polyline.setMap(null);

    setPointObj({
      startPoint: { marker: null, lat: null, lng: null },
      endPoint: { marker: null, lat: null, lng: null }
    });
    setPolyline(null);
    setSearchResults([]);
    setSearchKeyword('');
  };

  return (
    <div className="map-container">
      <div id="map" className="map"></div>
      <div className="search-panel">
        <h2>장소 검색</h2>

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

        {searchResults.length > 0 && (
          <div className="search-results">
            <h3>검색 결과</h3>
            <ul>
              {searchResults.map((place, index) => (
                <li key={index}>
                  <div className="place-info" onClick={() => moveToPlace(place)}>
                    <strong>{place.place_name}</strong>
                    <p>{place.address_name}</p>
                  </div>
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

        <div className="route-actions">
          <h3>경로 찾기</h3>
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

          <div className="action-buttons">
            <button
              className="route-button"
              onClick={getCurrentLocation}
            >
              현재 위치
            </button>

            <button
              className="route-button"
              onClick={getCarDirection}
              disabled={!pointObj.startPoint.lat || !pointObj.endPoint.lat}
            >
              경로 찾기
            </button>

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