'use client';

import React, { useState, useCallback } from 'react';
import { DeckGL } from '@deck.gl/react';
import {
  ScatterplotLayer,
  PathLayer,
  PointCloudLayer,
} from '@deck.gl/layers';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import { ScenegraphLayer } from '@deck.gl/mesh-layers';
import { MapViewState, PickingInfo } from '@deck.gl/core';
import Map from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

// Types
type DataPoint = {
  position: [number, number] | [number, number, number];
  color?: [number, number, number];
  name?: string;
  value?: number;
  category?: string;
  population?: number;
  price?: number;
};

type PathData = {
  path: [number, number][];
  name: string;
  color: [number, number, number];
};

// Seoul real estate and demographic data simulation
const generateSeoulRealEstateData = (): DataPoint[] => {
  const data: DataPoint[] = [];
  
  // 서울 25개 구의 실제 데이터 기반
  const seoulDistricts = [
    { lng: 127.0054, lat: 37.5494, name: '강남구', avgPrice: 150000, population: 560000, category: '상업지역' },
    { lng: 127.0470, lat: 37.5268, name: '서초구', avgPrice: 140000, population: 430000, category: '상업지역' },
    { lng: 127.0854, lat: 37.5448, name: '송파구', avgPrice: 120000, population: 660000, category: '주거지역' },
    { lng: 126.9882, lat: 37.5709, name: '중구', avgPrice: 90000, population: 130000, category: '상업지역' },
    { lng: 126.9780, lat: 37.5665, name: '종로구', avgPrice: 85000, population: 160000, category: '역사지역' },
    { lng: 127.0138, lat: 37.5957, name: '동대문구', avgPrice: 70000, population: 350000, category: '주거지역' },
    { lng: 126.9230, lat: 37.5547, name: '마포구', avgPrice: 95000, population: 380000, category: '문화지역' },
    { lng: 126.9017, lat: 37.5265, name: '영등포구', avgPrice: 75000, population: 400000, category: '상업지역' },
    { lng: 126.8959, lat: 37.5665, name: '여의도', avgPrice: 110000, population: 240000, category: '금융지역' },
    { lng: 127.0738, lat: 37.6543, name: '노원구', avgPrice: 55000, population: 540000, category: '주거지역' },
    { lng: 126.8880, lat: 37.4849, name: '구로구', avgPrice: 50000, population: 440000, category: '공업지역' },
    { lng: 127.1265, lat: 37.5407, name: '강동구', avgPrice: 65000, population: 460000, category: '주거지역' },
  ];
  
  seoulDistricts.forEach((district) => {
    // 각 구별로 인구밀도와 부동산 가격에 따라 포인트 생성
    const pointCount = Math.floor(district.population / 10000); // 인구 1만명당 1개 포인트
    
    for (let i = 0; i < pointCount; i++) {
      // 지역별 특성에 따른 높이 (부동산 가격 반영)
      const height = (district.avgPrice / 1000) + Math.random() * 100;
      
      // 지역 카테고리별 색상
      let color: [number, number, number];
      switch (district.category) {
        case '상업지역': color = [255, 100, 100]; break; // 빨강 - 상업
        case '주거지역': color = [100, 255, 100]; break; // 초록 - 주거
        case '문화지역': color = [255, 255, 100]; break; // 노랑 - 문화
        case '금융지역': color = [100, 100, 255]; break; // 파랑 - 금융
        case '공업지역': color = [150, 150, 150]; break; // 회색 - 공업
        case '역사지역': color = [200, 100, 255]; break; // 보라 - 역사
        default: color = [255, 255, 255];
      }
      
      data.push({
        position: [
          district.lng + (Math.random() - 0.5) * 0.015,
          district.lat + (Math.random() - 0.5) * 0.015,
          height,
        ],
        color,
        name: `${district.name} ${district.category}`,
        value: district.avgPrice / 1000,
        category: district.category,
        population: district.population,
        price: district.avgPrice,
      });
    }
  });
  
  return data;
};

// Seoul air quality monitoring stations
const generateAirQualityData = (): DataPoint[] => {
  const data: DataPoint[] = [];
  
  // 서울시 대기질 측정소 위치 (실제 위치 기반)
  const airStations = [
    { lng: 127.0054, lat: 37.5494, name: '강남대로', pm25: 35, pm10: 45 },
    { lng: 126.9780, lat: 37.5665, name: '시청앞', pm25: 40, pm10: 55 },
    { lng: 126.9230, lat: 37.5547, name: '홍대입구', pm25: 42, pm10: 58 },
    { lng: 127.0160, lat: 37.5172, name: '잠실', pm25: 38, pm10: 48 },
    { lng: 126.9017, lat: 37.5665, name: '여의도', pm25: 33, pm10: 43 },
    { lng: 127.0738, lat: 37.6543, name: '노원', pm25: 28, pm10: 38 },
    { lng: 126.8880, lat: 37.4849, name: '구로', pm25: 45, pm10: 65 },
    { lng: 127.1265, lat: 37.5407, name: '강동', pm25: 32, pm10: 42 },
  ];
  
  airStations.forEach((station) => {
    // PM2.5 농도에 따른 색상 (좋음: 파랑, 나쁨: 빨강)
    const pm25Level = station.pm25;
    let color: [number, number, number];
    if (pm25Level <= 15) color = [0, 100, 255];      // 좋음 - 파랑
    else if (pm25Level <= 35) color = [0, 255, 100]; // 보통 - 초록
    else if (pm25Level <= 75) color = [255, 255, 0]; // 나쁨 - 노랑
    else color = [255, 0, 0];                        // 매우나쁨 - 빨강
    
    data.push({
      position: [station.lng, station.lat, pm25Level * 10], // 높이로 농도 표현
      color,
      name: `${station.name} 측정소 (PM2.5: ${station.pm25}μg/m³)`,
      value: station.pm25,
      category: '대기질측정소',
    });
  });
  
  return data;
};

// Combined data generator
const generateSampleData = (): DataPoint[] => {
  return generateSeoulRealEstateData();
};

const generatePathData = (): PathData[] => {
  const paths: PathData[] = [];
  // 서울 주요 지하철 노선 시뮬레이션
  const subwayRoutes = [
    { name: '2호선 강남-신도림', points: [[127.0054, 37.5494], [127.0011, 37.5172], [126.9397, 37.5156], [126.8877, 37.5084]] },
    { name: '1호선 서울역-청량리', points: [[126.9708, 37.5547], [126.9819, 37.5579], [127.0039, 37.5802], [127.0468, 37.5802]] },
    { name: '3호선 연신내-압구정', points: [[126.9210, 37.6190], [126.9524, 37.5844], [126.9780, 37.5665], [127.0054, 37.5433], [127.0283, 37.5270]] },
    { name: '4호선 당고개-사당', points: [[127.0568, 37.6569], [127.0465, 37.6134], [127.0054, 37.5494], [126.9816, 37.4763]] },
    { name: '5호선 방화-상일동', points: [[126.8120, 37.5612], [126.9230, 37.5547], [127.0160, 37.5172], [127.1659, 37.5481]] },
  ];
  
  subwayRoutes.forEach((route, idx) => {
    const path: [number, number][] = [];
    
    // 각 포인트 사이를 보간하여 부드러운 경로 생성
    for (let i = 0; i < route.points.length - 1; i++) {
      const start = route.points[i];
      const end = route.points[i + 1];
      const steps = 10;
      
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        path.push([
          start[0] + (end[0] - start[0]) * t + (Math.random() - 0.5) * 0.001,
          start[1] + (end[1] - start[1]) * t + (Math.random() - 0.5) * 0.001,
        ]);
      }
    }
    
    // 지하철 노선별 색상
    const lineColors: [number, number, number][] = [
      [0, 153, 0],    // 2호선 초록
      [0, 52, 120],   // 1호선 남색
      [255, 95, 0],   // 3호선 주황
      [0, 168, 213],  // 4호선 하늘색
      [150, 93, 165], // 5호선 보라
    ];
    
    paths.push({
      path,
      name: route.name,
      color: lineColors[idx % lineColors.length],
    });
  });
  
  // 추가 랜덤 경로 생성 (버스 노선 시뮬레이션)
  for (let i = 0; i < 10; i++) {
    const startLng = 126.8 + Math.random() * 0.3;
    const startLat = 37.45 + Math.random() * 0.2;
    const path: [number, number][] = [];
    
    for (let j = 0; j < 15; j++) {
      path.push([
        startLng + j * 0.005 + (Math.random() - 0.5) * 0.003,
        startLat + j * 0.003 + (Math.random() - 0.5) * 0.003,
      ]);
    }
    
    paths.push({
      path,
      name: `버스 노선 ${i + 1}`,
      color: [
        Math.floor(Math.random() * 100) + 155,
        Math.floor(Math.random() * 100) + 155,
        Math.floor(Math.random() * 100) + 155,
      ],
    });
  }
  
  return paths;
};

export default function DeckGLVisualization() {
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 126.9780,  // 서울시청 경도
    latitude: 37.5665,    // 서울시청 위도
    zoom: 11,
    pitch: 45,
    bearing: 0,
  });

  const [selectedLayer, setSelectedLayer] = useState<string>('scatterplot');
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const sampleData = generateSampleData();
  const pathData = generatePathData();

  const airQualityData = generateAirQualityData();

  const getLayers = useCallback(() => {
    switch (selectedLayer) {
      case 'scatterplot':
        return [
          new ScatterplotLayer<DataPoint>({
            id: 'scatterplot-layer',
            data: sampleData,
            getPosition: (d) => d.position,
            getFillColor: (d) => d.color || [255, 140, 0],
            getRadius: (d) => Math.sqrt((d.value || 10) * 10),
            radiusScale: 3,
            radiusMinPixels: 1,
            radiusMaxPixels: 50,
            pickable: true,
            opacity: 0.8,
          }),
        ];

      case 'hexagon':
        return [
          new HexagonLayer<DataPoint>({
            id: 'hexagon-layer',
            data: sampleData,
            getPosition: (d) => d.position,
            getColorWeight: (d) => d.value || 1,
            getElevationWeight: (d) => d.value || 1,
            elevationScale: 4,
            extruded: true,
            radius: 200,
            pickable: true,
            opacity: 0.8,
          }),
        ];

      case 'path':
        return [
          new PathLayer<PathData>({
            id: 'path-layer',
            data: pathData,
            getPath: (d) => d.path,
            getColor: (d) => d.color,
            getWidth: 12,
            widthMinPixels: 2,
            pickable: true,
            rounded: true,
            billboard: true,
          }),
        ];

      case 'pointcloud':
        return [
          new PointCloudLayer<DataPoint>({
            id: 'pointcloud-layer',
            data: airQualityData,
            getPosition: (d) => d.position,
            getColor: (d) => d.color || [255, 255, 255],
            getNormal: [0, 0, 1],
            pointSize: 8,
            pickable: true,
          }),
        ];

      case 'scenegraph':
        const scenegraphData = sampleData.slice(0, 50).map((d) => ({
          ...d,
          orientation: [0, Math.random() * 180, 90] as [number, number, number],
        }));
        
        return [
          new ScenegraphLayer({
            id: 'scenegraph-layer',
            data: scenegraphData,
            getPosition: (d: DataPoint & { orientation: [number, number, number] }) => d.position,
            getOrientation: (d: DataPoint & { orientation: [number, number, number] }) => d.orientation,
            scenegraph: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb',
            sizeScale: 50,
            pickable: true,
          }),
        ];

      default:
        return [];
    }
  }, [selectedLayer]);

  const handleHover = useCallback(({ x, y, object }: PickingInfo) => {
    if (object) {
      let text = '';
      if ('name' in object) {
        const dataObj = object as DataPoint;
        if (dataObj.category === '대기질측정소') {
          text = dataObj.name || 'Unknown';
        } else if (dataObj.price) {
          text = `${dataObj.name}\n평균 매매가: ${dataObj.price.toLocaleString()}만원/평\n인구: ${dataObj.population?.toLocaleString()}명`;
        } else {
          text = dataObj.name || 'Unknown';
        }
      } else if ('elevationValue' in object) {
        text = `인구밀도: ${object.elevationValue}명`;
      }
      setTooltip({ x, y, text });
    } else {
      setTooltip(null);
    }
  }, []);

  return (
    <div className="relative w-full h-screen">
      <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg max-h-[calc(100vh-2rem)] overflow-y-auto w-80 max-w-[calc(100vw-2rem)]">
        <h2 className="text-xl font-bold mb-4">서울시 실시간 데이터 시각화</h2>
        <div className="mb-4 text-xs text-gray-700">
          <div className="grid grid-cols-2 gap-1">
            <p><span className="w-2 h-2 bg-red-500 inline-block mr-1"></span>상업</p>
            <p><span className="w-2 h-2 bg-green-500 inline-block mr-1"></span>주거</p>
            <p><span className="w-2 h-2 bg-yellow-500 inline-block mr-1"></span>문화</p>
            <p><span className="w-2 h-2 bg-blue-500 inline-block mr-1"></span>금융</p>
            <p><span className="w-2 h-2 bg-gray-500 inline-block mr-1"></span>공업</p>
            <p><span className="w-2 h-2 bg-purple-500 inline-block mr-1"></span>역사</p>
          </div>
        </div>
        <div className="space-y-1">
          <button
            onClick={() => setSelectedLayer('scatterplot')}
            className={`block w-full text-left px-3 py-2 text-sm rounded ${
              selectedLayer === 'scatterplot'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            🏢 부동산 가격 분포
          </button>
          <button
            onClick={() => setSelectedLayer('hexagon')}
            className={`block w-full text-left px-3 py-2 text-sm rounded ${
              selectedLayer === 'hexagon'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            👥 지역별 인구밀도
          </button>
          <button
            onClick={() => setSelectedLayer('path')}
            className={`block w-full text-left px-3 py-2 text-sm rounded ${
              selectedLayer === 'path'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            🚇 지하철 노선도
          </button>
          <button
            onClick={() => setSelectedLayer('pointcloud')}
            className={`block w-full text-left px-3 py-2 text-sm rounded ${
              selectedLayer === 'pointcloud'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            🌫️ 대기질 측정망
          </button>
          <button
            onClick={() => setSelectedLayer('scenegraph')}
            className={`block w-full text-left px-3 py-2 text-sm rounded ${
              selectedLayer === 'scenegraph'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            🏗️ 주요 건물 3D
          </button>
        </div>
        <div className="mt-3 text-xs text-gray-600">
          <details className="mb-2">
            <summary className="font-semibold cursor-pointer">📊 시각화 안내</summary>
            <div className="mt-1 pl-2">
              <p>• 부동산: 높이=가격, 색상=지역특성</p>
              <p>• 인구밀도: 3D 육각형 히트맵</p>
              <p>• 대기질: 농도별 색상 분류</p>
            </div>
          </details>
          <details>
            <summary className="font-semibold cursor-pointer">🕹️ 조작 방법</summary>
            <div className="mt-1 pl-2">
              <p><strong>🖱️ 마우스:</strong></p>
              <p>• 좌클릭: 이동 / Ctrl+좌클릭: 회전</p>
              <p>• 휠: 줌 / 더블클릭: 줌인</p>
              <p><strong>📱 터치:</strong></p>
              <p>• 1손가락: 이동 / 2손가락: 줌&회전</p>
            </div>
          </details>
        </div>
      </div>

      <DeckGL
        viewState={viewState}
        onViewStateChange={(e) => {
          if (e.viewState && 'longitude' in e.viewState) {
            setViewState(e.viewState as MapViewState);
          }
        }}
        controller={{
          dragPan: true,
          dragRotate: true,
          doubleClickZoom: true,
          touchZoom: true,
          touchRotate: true,
          keyboard: true,
          scrollZoom: { speed: 0.01, smooth: true },
          // Ctrl 키와 함께 좌클릭으로 회전
          inertia: true,
        }}
        layers={getLayers()}
        onHover={handleHover}
      >
        <Map
          mapStyle="mapbox://styles/mapbox/light-v11"
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''}
        />
      </DeckGL>

      {tooltip && (
        <div
          className="absolute bg-black bg-opacity-80 text-white px-2 py-1 rounded pointer-events-none z-20"
          style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}