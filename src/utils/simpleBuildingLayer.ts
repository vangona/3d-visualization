// 간단한 3D 건물 레이어 (GeoJsonLayer 사용)

import { GeoJsonLayer } from '@deck.gl/layers';
import { WeatherStation } from '@/types/weather';
import type { Feature, FeatureCollection, Polygon } from 'geojson';

// 건물 properties 타입 정의
interface BuildingProperties {
  name: string;
  height: number;
}

// 서울의 주요 건물들 샘플 데이터
const SAMPLE_BUILDINGS: FeatureCollection<Polygon, BuildingProperties> = {
  type: "FeatureCollection",
  features: [
    // 롯데월드타워
    {
      type: "Feature",
      properties: { name: "롯데월드타워", height: 554 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.1026, 37.5125],
          [127.1030, 37.5125],
          [127.1030, 37.5129],
          [127.1026, 37.5129],
          [127.1026, 37.5125]
        ]]
      }
    },
    // 서울시청
    {
      type: "Feature", 
      properties: { name: "서울시청", height: 120 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9770, 37.5655],
          [126.9780, 37.5655],
          [126.9780, 37.5665],
          [126.9770, 37.5665],
          [126.9770, 37.5655]
        ]]
      }
    },
    // 경복궁
    {
      type: "Feature",
      properties: { name: "경복궁", height: 25 },
      geometry: {
        type: "Polygon", 
        coordinates: [[
          [126.9740, 37.5780],
          [126.9790, 37.5780],
          [126.9790, 37.5820],
          [126.9740, 37.5820],
          [126.9740, 37.5780]
        ]]
      }
    },
    // 강남역 주변 빌딩들
    {
      type: "Feature",
      properties: { name: "강남 빌딩1", height: 180 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0270, 37.4975],
          [127.0280, 37.4975],
          [127.0280, 37.4985],
          [127.0270, 37.4985],
          [127.0270, 37.4975]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "강남 빌딩2", height: 220 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0290, 37.4970],
          [127.0300, 37.4970],
          [127.0300, 37.4980],
          [127.0290, 37.4980],
          [127.0290, 37.4970]
        ]]
      }
    },
    // 홍대 주변
    {
      type: "Feature",
      properties: { name: "홍대 빌딩1", height: 80 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9220, 37.5560],
          [126.9230, 37.5560],
          [126.9230, 37.5570],
          [126.9220, 37.5570],
          [126.9220, 37.5560]
        ]]
      }
    },
    // 여의도
    {
      type: "Feature",
      properties: { name: "여의도 빌딩1", height: 300 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9240, 37.5200],
          [126.9250, 37.5200],
          [126.9250, 37.5210],
          [126.9240, 37.5210],
          [126.9240, 37.5200]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "여의도 빌딩2", height: 250 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9260, 37.5190],
          [126.9270, 37.5190],
          [126.9270, 37.5200],
          [126.9260, 37.5200],
          [126.9260, 37.5190]
        ]]
      }
    }
  ]
};

// 간단한 3D 건물 레이어 생성
export const createSimple3DBuildingLayer = (
  weatherStations: WeatherStation[],
  zoom: number
) => {
  if (zoom < 13) return null; // 줌 13부터 표시

  console.log('Creating simple 3D building layer at zoom:', zoom);

  return new GeoJsonLayer({
    id: 'simple-buildings-3d',
    data: SAMPLE_BUILDINGS,
    
    // 3D 설정
    pickable: true,
    stroked: true,
    filled: true,
    extruded: true,
    wireframe: false,
    
    // 건물 높이
    getElevation: (d) => {
      const feature = d as Feature<Polygon, BuildingProperties>;
      return feature.properties.height || 50;
    },
    
    // 건물 색상 (날씨 기반)
    getFillColor: (d) => {
      const feature = d as Feature<Polygon, BuildingProperties>;
      // 건물 중심점 계산
      const coords = feature.geometry.coordinates[0];
      let lon = 0, lat = 0;
      for (const point of coords) {
        lon += point[0];
        lat += point[1];
      }
      lon /= coords.length;
      lat /= coords.length;
      
      // 가장 가까운 날씨 관측소 찾기
      let minDistance = Infinity;
      let nearestStation = weatherStations[0];
      
      for (const station of weatherStations) {
        const distance = Math.sqrt(
          Math.pow(lon - station.location.longitude, 2) + 
          Math.pow(lat - station.location.latitude, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestStation = station;
        }
      }
      
      // 날씨에 따른 색상
      if (!nearestStation) return [200, 200, 200, 180];
      
      const precipitation = nearestStation.weather.precipitation;
      if (precipitation > 20) return [100, 150, 255, 200]; // 폭우 - 진한 파랑
      if (precipitation > 10) return [150, 180, 255, 200]; // 비 - 파랑
      if (precipitation > 1) return [200, 220, 255, 200];  // 약한 비 - 연한 파랑
      if (nearestStation.weather.cloudCoverage > 50) return [180, 180, 190, 200]; // 흐림 - 회색
      return [255, 220, 150, 200]; // 맑음 - 노랑
    },
    
    // 건물 테두리
    getLineColor: [80, 80, 80, 255],
    getLineWidth: 2,
    lineWidthMinPixels: 1,
    lineWidthMaxPixels: 3,
    
    // 3D 렌더링 설정  
    opacity: 0.9,
    
    // 머티리얼
    material: {
      ambient: 0.6,
      diffuse: 0.8,
      shininess: 32,
      specularColor: [255, 255, 255]
    },
    
    // 성능 최적화
    updateTriggers: {
      getFillColor: [weatherStations]
    }
  });
};