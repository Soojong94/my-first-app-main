import React, { useEffect, useState, useRef } from 'react';
import './Map.css';

const { kakao } = window;

const Map = () => {
  // 지도 객체를 저장할 useRef 추가
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [pointObj, setPointObj] = useState({
    startPoint: { marker: null, lat: null, lng: null },
    endPoint: { marker: null, lat: null, lng: null }
  });
  const [polyline, setPolyline] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // 지도 초기화 - 컴포넌트 마운트 시에만 실행
  useEffect(() => {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    const mapOptions = {
      center: new kakao.maps.LatLng(35.1575, 126.8476), // 광주 동구 중심 좌표
      level: 3 // 지도의 확대 레벨
    };

    // 지도 객체 생성 및 저장
    const kakaoMap = new kakao.maps.Map(mapContainer, mapOptions);

    // 지도 컨트롤 추가
    const zoomControl = new kakao.maps.ZoomControl();
    kakaoMap.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

    // 생성된 지도 객체를 상태와 ref 모두에 저장
    setMap(kakaoMap);
    mapRef.current = kakaoMap;
  }, []); // 컴포넌트 마운트 시에만 실행

  // pointObj가 변경될 때마다 마커 업데이트
  useEffect(() => {
    if (!map) return;

    for (const point in pointObj) {
      if (pointObj[point].marker) {
        pointObj[point].marker.setMap(map);
      }
    }
  }, [pointObj, map]);

  // 장소 검색 기능
  const searchPlaces = () => {
    if (!map || !searchKeyword.trim()) {
      alert('검색어를 입력하세요!');
      return;
    }

    setSearching(true);
    setSearchResults([]);

    const places = new kakao.maps.services.Places();

    // 키워드로 장소 검색
    places.keywordSearch(searchKeyword, (result, status) => {
      if (status === kakao.maps.services.Status.OK) {
        console.log('검색 결과:', result);
        setSearchResults(result);
      } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
        alert('검색 결과가 존재하지 않습니다.');
      } else if (status === kakao.maps.services.Status.ERROR) {
        alert('검색 중 오류가 발생했습니다.');
      }
      setSearching(false);
    });
  };

  // 검색 결과 항목 클릭 시 지도 이동
  const moveToPlace = (place) => {
    const lat = parseFloat(place.y);
    const lng = parseFloat(place.x);

    // 해당 위치로 지도 중심 이동
    panTo({ lat, lng });
  };

  // 선택한 검색 결과를 출발지/목적지로 설정
  const selectSearchResult = (place, pointType) => {
    const lat = parseFloat(place.y);
    const lng = parseFloat(place.x);

    setPoint({ lat, lng }, pointType);

    // 선택한 위치로 지도 중심 이동
    panTo({ lat, lng });
  };

  // 지도 중심 부드럽게 이동
  function panTo({ lat, lng }) {
    if (!mapRef.current) return;

    const moveLatLon = new kakao.maps.LatLng(lat, lng);
    mapRef.current.panTo(moveLatLon);
  }

  // 출발지 또는 목적지 설정
  function setPoint({ lat, lng }, pointType) {
    if (!mapRef.current) return;

    // 마커 이미지 설정 (출발지는 빨간색, 목적지는 파란색)
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

  // 현재 위치 가져오기
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // 현재 위치로 지도 이동
          panTo({ lat, lng });

          // 기본적으로 출발지로 설정
          setPoint({ lat, lng }, 'startPoint');
        },
        (error) => {
          console.error('현재 위치를 가져오는데 실패했습니다:', error);
          alert('현재 위치를 가져오는데 실패했습니다.');
        }
      );
    } else {
      alert('이 브라우저에서는 위치 정보를 지원하지 않습니다.');
    }
  };

  // 카카오 모빌리티 API를 사용하여 자동차 경로 가져오기
  async function getCarDirection() {
    if (!mapRef.current) return;
    if (!pointObj.startPoint.lat || !pointObj.endPoint.lat) {
      alert('출발지와 목적지를 모두 설정해주세요.');
      return;
    }

    try {
      // REST API 키 (실제 서비스에서는 서버에서 관리해야 합니다)
      const REST_API_KEY = '실제 rest api key';
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
      newPolyline.setMap(mapRef.current);
      setPolyline(newPolyline);

      // 경로가 모두 보이도록 지도 영역 조정
      const bounds = new kakao.maps.LatLngBounds();
      linePath.forEach(point => bounds.extend(point));
      mapRef.current.setBounds(bounds);

    } catch (error) {
      console.error('경로 가져오기 오류:', error);

      // API 호출 실패 시 직선 경로로 대체 (테스트용)
      showStraightRoute();
    }
  }

  // 직선 경로 표시 (API 호출 실패 시 폴백 또는 테스트용)
  function showStraightRoute() {
    if (!mapRef.current || !pointObj.startPoint.lat || !pointObj.endPoint.lat) {
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
    newPolyline.setMap(mapRef.current);
    setPolyline(newPolyline);

    // 모든 마커와 경로가 보이도록 지도 영역 조정
    const bounds = new kakao.maps.LatLngBounds();
    bounds.extend(new kakao.maps.LatLng(pointObj.startPoint.lat, pointObj.startPoint.lng));
    bounds.extend(new kakao.maps.LatLng(pointObj.endPoint.lat, pointObj.endPoint.lng));
    mapRef.current.setBounds(bounds);
  }

  // 모든 마커와 경로 초기화
  const resetAll = () => {
    // 모든 마커 제거
    for (const point in pointObj) {
      if (pointObj[point].marker !== null) {
        pointObj[point].marker.setMap(null);
      }
    }

    // 경로 제거
    if (polyline) {
      polyline.setMap(null);
    }

    // 상태 초기화
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