// MVT 레이어 생성 유틸리티

import { WeatherStation } from '@/types/weather';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MVTLayer = require('@deck.gl/geo-layers').MVTLayer;

// 건물 레이어 생성
export const createBuildingMVTLayer = (
  weatherStations: WeatherStation[],
  zoom: number
) => {
  if (zoom < 15) return null;

  console.log('Creating building MVT layer at zoom:', zoom);

  return new MVTLayer({
    id: 'buildings-mvt',
    data: `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/{z}/{x}/{y}.vector.pbf?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`,
    
    // 3D 건물 설정
    pickable: true,
    stroked: true,
    filled: true,
    extruded: true,  // 3D 압출 활성화
    wireframe: false,
    
    // Mapbox 건물 레이어 선택
    sourceLayer: 'building', // Mapbox Streets의 건물 레이어
    
    // 간단한 기본 색상으로 테스트
    getFillColor: [200, 150, 100, 180] as [number, number, number, number], // 기본 건물 색상
    
    // 기본 높이로 테스트
    getElevation: 50, // 모든 건물 50m 높이
    
    // 3D 건물 기본 높이 설정
    elevationScale: 1,
    
    // 건물 테두리
    getLineColor: [100, 100, 100, 180] as [number, number, number, number],
    getLineWidth: 1,
    lineWidthMinPixels: 0.5,
    lineWidthMaxPixels: 2,
    
    // 성능 최적화
    updateTriggers: {
      getFillColor: weatherStations,
      getElevation: weatherStations
    },
    
    // 3D 건물 머티리얼 설정
    material: {
      ambient: 0.4,  // 주변광 (그림자 영역)
      diffuse: 0.8,  // 확산광 (일반 표면)
      shininess: 16, // 광택도
      specularColor: [200, 200, 200] as [number, number, number] // 반사광 색상
    }
  });
};

// 도로 레이어 생성
export const createRoadMVTLayer = (
  weatherStations: WeatherStation[],
  zoom: number
) => {
  if (zoom < 15) return null;

  console.log('Creating road MVT layer at zoom:', zoom);

  return new MVTLayer({
    id: 'roads-mvt',
    data: `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/{z}/{x}/{y}.vector.pbf?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`,
    
    // 도로 레이어만 선택
    pickable: true,
    stroked: true,
    filled: false,
    extruded: false,
    
    // Mapbox 도로 레이어 선택
    sourceLayer: 'road', // Mapbox Streets의 도로 레이어
    
    // 도로 색상 (기본값)
    getLineColor: [150, 150, 150, 200] as [number, number, number, number],
    
    // 도로 폭 (기본값)
    getLineWidth: 4,
    
    lineWidthMinPixels: 1,
    lineWidthMaxPixels: 20,
    lineWidthUnits: 'meters',
    
    // 성능 최적화
    updateTriggers: {
      getLineColor: weatherStations,
      getLineWidth: weatherStations
    }
  });
};

// 수역 레이어 생성
export const createWaterMVTLayer = (
  weatherStations: WeatherStation[],
  zoom: number
) => {
  if (zoom < 15) return null;

  console.log('Creating water MVT layer at zoom:', zoom);

  return new MVTLayer({
    id: 'water-mvt',
    data: `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/{z}/{x}/{y}.vector.pbf?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`,
    
    // 수역 레이어만 선택
    pickable: true,
    stroked: false,
    filled: true,
    extruded: false,
    
    // Mapbox 수역 레이어 선택
    sourceLayer: 'water', // Mapbox Streets의 수역 레이어
    
    // 수역 색상 (기본값)
    getFillColor: [100, 150, 200, 120] as [number, number, number, number],
    
    // 성능 최적화
    updateTriggers: {
      getFillColor: weatherStations
    },
    
    // 약간의 투명도로 깊이감 표현
    opacity: 0.8
  });
};

// 모든 MVT 레이어를 한 번에 생성
export const createAllMVTLayers = (
  weatherStations: WeatherStation[],
  zoom: number
) => {
  const layers = [];
  
  // 줌 15 이상에서만 MVT 레이어 표시
  if (zoom >= 15) {
    const waterLayer = createWaterMVTLayer(weatherStations, zoom);
    const roadLayer = createRoadMVTLayer(weatherStations, zoom);
    const buildingLayer = createBuildingMVTLayer(weatherStations, zoom);
    
    if (waterLayer) layers.push(waterLayer);
    if (roadLayer) layers.push(roadLayer);
    if (buildingLayer) layers.push(buildingLayer);
    
    console.log(`Created ${layers.length} MVT layers for zoom ${zoom}`);
  }
  
  return layers;
};