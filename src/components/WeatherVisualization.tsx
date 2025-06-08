'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { DeckGL } from '@deck.gl/react';
import {
  PointCloudLayer,
  ScatterplotLayer,
} from '@deck.gl/layers';
import { 
  MapViewState, 
  PickingInfo,
  LightingEffect,
  AmbientLight,
  DirectionalLight,
  FlyToInterpolator,
} from '@deck.gl/core';
import Map from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { GeoJsonLayer } from '@deck.gl/layers';
import * as turf from '@turf/turf';
import { SeoulDistrictFeature, SeoulGeoJSON } from '@/data/seoul-geojson-loader';

// Types
interface WeatherStation {
  id: string;
  name: string;
  location: {
    longitude: number;
    latitude: number;
  };
  weather: WeatherData;
}

interface WeatherData {
  precipitation: number;      // 강수량 (mm/h)
  temperature: number;        // 온도 (°C)
  humidity: number;          // 습도 (%)
  windSpeed: number;         // 풍속 (m/s)
  windDirection: number;     // 풍향 (도)
  cloudCoverage: number;     // 구름양 (0-100%)
  visibility: number;        // 가시거리 (m)
  timestamp: string;         // ISO 8601 형식
}

interface CloudParticle {
  position: [number, number, number];  // [lng, lat, altitude]
  size: number;                       // 구름 입자 크기
  density: number;                    // 밀도 (0-1)
  color: [number, number, number];    // RGB
  opacity: number;                    // 투명도 (0-1)
}

interface RainParticle {
  id: string;
  position: [number, number, number];  // [lng, lat, altitude]
  velocity: [number, number, number];  // [vx, vy, vz]
  size: number;                       // 빗방울 크기
  lifetime: number;                   // 생존 시간 (초)
}

interface DongInfo {
  dongName: string;
  guName: string;
  fullName: string;
  center: [number, number];  // [lng, lat]
  guWeatherStation: WeatherStation;
}

// Weather state color definitions (5-level system)
interface WeatherColorConfig {
  id: string;
  name: string;
  emoji: string;
  precipitation: [number, number]; // [min, max] mm/h
  cloudCoverage: [number, number]; // [min, max] %
  colors: {
    cloud: [number, number, number, number]; // RGBA
    rain: [number, number, number, number];  // RGBA
    ambient: [number, number, number];       // RGB
    sky: { brightness: number; contrast: number };
  };
}

const WEATHER_STATES: WeatherColorConfig[] = [
  {
    id: 'clear',
    name: '맑음',
    emoji: '☀️',
    precipitation: [0, 0],
    cloudCoverage: [0, 20],
    colors: {
      cloud: [255, 255, 255, 0.15],    // 매우 희미한 흰색 구름
      rain: [135, 206, 235, 0],        // 비 없음
      ambient: [255, 248, 220],        // 따뜻한 햇빛
      sky: { brightness: 1.0, contrast: 1.0 }
    }
  },
  {
    id: 'partly_cloudy',
    name: '구름조금',
    emoji: '⛅',
    precipitation: [0, 0.5],
    cloudCoverage: [20, 50],
    colors: {
      cloud: [250, 250, 250, 0.25],    // 매우 밝은 흰색 구름
      rain: [176, 196, 222, 0.1],      // 매우 약한 비
      ambient: [245, 245, 220],        // 부드러운 노란빛
      sky: { brightness: 0.9, contrast: 0.95 }
    }
  },
  {
    id: 'cloudy',
    name: '흐림',
    emoji: '☁️',
    precipitation: [0.5, 2],
    cloudCoverage: [50, 75],
    colors: {
      cloud: [230, 230, 230, 0.4],     // 밝은 회색 구름
      rain: [119, 136, 153, 0.3],      // 약한 회색 비
      ambient: [220, 220, 220],        // 차가운 회색빛
      sky: { brightness: 0.75, contrast: 0.85 }
    }
  },
  {
    id: 'rainy',
    name: '비',
    emoji: '🌧️',
    precipitation: [2, 10],
    cloudCoverage: [75, 90],
    colors: {
      cloud: [180, 180, 180, 0.6],     // 중간 회색 구름
      rain: [70, 130, 180, 0.6],       // 파란빛 비
      ambient: [169, 169, 169],        // 어두운 회색빛
      sky: { brightness: 0.5, contrast: 0.7 }
    }
  },
  {
    id: 'heavy_rain',
    name: '폭우',
    emoji: '⛈️',
    precipitation: [10, 50],
    cloudCoverage: [90, 100],
    colors: {
      cloud: [120, 120, 120, 0.8],     // 어두운 회색 구름 (덜 검게)
      rain: [25, 25, 112, 0.8],        // 짙은 남색 비
      ambient: [105, 105, 105],        // 매우 어두운 회색
      sky: { brightness: 0.3, contrast: 0.6 }
    }
  }
];

// Function to determine weather state based on precipitation and cloud coverage
const getWeatherState = (precipitation: number, cloudCoverage: number): WeatherColorConfig => {
  for (const state of WEATHER_STATES) {
    const [minPrec, maxPrec] = state.precipitation;
    const [minCloud, maxCloud] = state.cloudCoverage;
    
    if (precipitation >= minPrec && precipitation <= maxPrec && 
        cloudCoverage >= minCloud && cloudCoverage <= maxCloud) {
      return state;
    }
  }
  
  // Fallback: determine by precipitation level
  if (precipitation >= 10) return WEATHER_STATES[4]; // heavy_rain
  if (precipitation >= 2) return WEATHER_STATES[3];  // rainy
  if (precipitation >= 0.5) return WEATHER_STATES[2]; // cloudy
  if (cloudCoverage >= 20) return WEATHER_STATES[1]; // partly_cloudy
  return WEATHER_STATES[0]; // clear
};

// Helper function to get weather display for station
const getWeatherDisplay = (station: WeatherStation): string => {
  const weatherState = getWeatherState(station.weather.precipitation, station.weather.cloudCoverage);
  return `${weatherState.name} ${weatherState.emoji}`;
};

// Generate dong data from GeoJSON and associate with gu weather stations
const generateDongData = (geoJSON: SeoulGeoJSON | null, weatherStations: WeatherStation[]): DongInfo[] => {
  if (!geoJSON) return [];
  
  const dongList: DongInfo[] = [];
  
  geoJSON.features.forEach((feature) => {
    const fullName = feature.properties.adm_nm;
    const guName = feature.properties.sggnm;
    
    // Extract dong name (remove Seoul + gu prefix)
    const parts = fullName.split(' ');
    const dongName = parts[parts.length - 1]; // Last part is dong name
    
    // Find corresponding weather station for this gu
    const guWeatherStation = weatherStations.find(station => station.name === guName);
    if (!guWeatherStation) return;
    
    // Calculate centroid of the dong
    try {
      const centroid = turf.centroid(feature);
      const center: [number, number] = [
        centroid.geometry.coordinates[0],
        centroid.geometry.coordinates[1]
      ];
      
      dongList.push({
        dongName,
        guName,
        fullName,
        center,
        guWeatherStation
      });
    } catch (error) {
      console.warn(`Failed to calculate centroid for ${fullName}:`, error);
    }
  });
  
  return dongList;
};

// Mock weather stations data for Seoul - All 25 districts
const generateMockWeatherStations = (): WeatherStation[] => {
  const seoulDistricts = [
    { name: '강남구', lng: 127.0474, lat: 37.5172 },
    { name: '강동구', lng: 127.1238, lat: 37.5301 },
    { name: '강북구', lng: 127.0277, lat: 37.6397 },
    { name: '강서구', lng: 126.8497, lat: 37.5509 },
    { name: '관악구', lng: 126.9515, lat: 37.4781 },
    { name: '광진구', lng: 127.0853, lat: 37.5384 },
    { name: '구로구', lng: 126.8876, lat: 37.4954 },
    { name: '금천구', lng: 126.9018, lat: 37.4569 },
    { name: '노원구', lng: 127.0568, lat: 37.6542 },
    { name: '도봉구', lng: 127.0470, lat: 37.6658 },
    { name: '동대문구', lng: 127.0399, lat: 37.5744 },
    { name: '동작구', lng: 126.9393, lat: 37.5124 },
    { name: '마포구', lng: 126.9016, lat: 37.5664 },
    { name: '서대문구', lng: 126.9369, lat: 37.5791 },
    { name: '서초구', lng: 127.0327, lat: 37.4837 },
    { name: '성동구', lng: 127.0366, lat: 37.5635 },
    { name: '성북구', lng: 127.0167, lat: 37.5893 },
    { name: '송파구', lng: 127.1056, lat: 37.5145 },
    { name: '양천구', lng: 126.8665, lat: 37.5170 },
    { name: '영등포구', lng: 126.8962, lat: 37.5264 },
    { name: '용산구', lng: 126.9910, lat: 37.5326 },
    { name: '은평구', lng: 126.9292, lat: 37.6025 },
    { name: '종로구', lng: 126.9816, lat: 37.5735 },
    { name: '중구', lng: 126.9980, lat: 37.5636 },
    { name: '중랑구', lng: 127.0937, lat: 37.6063 },
  ];

  // 다양한 날씨 상태 시뮬레이션
  const weatherScenarios = [
    { precipitation: 0, cloudCoverage: 10, desc: '맑음' },
    { precipitation: 0.5, cloudCoverage: 40, desc: '구름조금' },
    { precipitation: 3, cloudCoverage: 70, desc: '약한비' },
    { precipitation: 10, cloudCoverage: 90, desc: '보통비' },
    { precipitation: 25, cloudCoverage: 100, desc: '강한비' },
  ];

  return seoulDistricts.map((district, index) => {
    const scenario = weatherScenarios[index % weatherScenarios.length];
    return {
      id: `station-${index}`,
      name: district.name,
      location: {
        longitude: district.lng,
        latitude: district.lat,
      },
      weather: {
        precipitation: scenario.precipitation,
        temperature: 15 + Math.random() * 10,
        humidity: 60 + scenario.cloudCoverage * 0.3,
        windSpeed: 2 + Math.random() * 5,
        windDirection: Math.random() * 360,
        cloudCoverage: scenario.cloudCoverage,
        visibility: 10000 - scenario.cloudCoverage * 80,
        timestamp: new Date().toISOString(),
      },
    };
  });
};

// Generate cloud particles based on weather data within district boundaries
const generateCloudParticles = (stations: WeatherStation[], geoJSON: SeoulGeoJSON | null): CloudParticle[] => {
  const particles: CloudParticle[] = [];
  
  if (!geoJSON) return particles;
  
  stations.forEach((station) => {
    // Get weather state and color configuration
    const weatherState = getWeatherState(station.weather.precipitation, station.weather.cloudCoverage);
    
    if (station.weather.cloudCoverage > 5) { // 구름이 있는 경우만 (더 민감하게)
      const cloudDensity = station.weather.cloudCoverage / 100;
      
      // 구름 클러스터 수: 밀도에 따라 조정
      const clusterCount = Math.floor(cloudDensity * 8) + 2;
      
      // 해당 구의 모든 동 features 찾기
      const districtFeatures = geoJSON.features.filter((f: SeoulDistrictFeature) => f.properties.sggnm === station.name);
      if (districtFeatures.length === 0) return;
      
      // 구 전체의 bbox 계산
      const districtCollection = turf.featureCollection(districtFeatures);
      
      try {
        const bbox = turf.bbox(districtCollection);
        
        // 구름 클러스터 생성
        for (let cluster = 0; cluster < clusterCount; cluster++) {
          // 각 클러스터의 중심점 찾기
          let clusterCenter: [number, number] | null = null;
          
          // bbox 내의 랜덤 포인트 생성하고, 실제 구역 내에 있는지 확인
          for (let attempt = 0; attempt < 10; attempt++) {
            const randomPoint = turf.randomPoint(1, { bbox });
            const point = randomPoint.features[0];
            
            // 해당 구의 어떤 동이라도 포함하는지 확인
            const isInDistrict = districtFeatures.some((feature) => 
              turf.booleanPointInPolygon(point, feature)
            );
            
            if (isInDistrict) {
              clusterCenter = point.geometry.coordinates as [number, number];
              break;
            }
          }
          
          if (!clusterCenter) {
            clusterCenter = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
          }
          
          // 적절한 수의 파티클로 조정
          const particlesPerCluster = Math.floor(cloudDensity * 15) + 8;
          
          for (let i = 0; i < particlesPerCluster; i++) {
            // 클러스터 중심 주변에 파티클 분산
            const spreadRadius = 0.004 + Math.random() * 0.008;
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.pow(Math.random(), 0.6) * spreadRadius;
            
            const point: [number, number] = [
              clusterCenter[0] + Math.cos(angle) * distance,
              clusterCenter[1] + Math.sin(angle) * distance
            ];
            
            // 구름 고도: 강수량이 많을수록 낮은 구름 + 클러스터별 변화
            const baseAltitude = 1800 - (station.weather.precipitation * 40) + (cluster * 200);
            const altitude = baseAltitude + Math.random() * 800;
            
            // 클러스터 중심에서의 거리에 따른 투명도 계산 (더 부드러운 그라데이션)
            const distanceFromClusterCenter = distance / spreadRadius;
            const baseOpacity = weatherState.colors.cloud[3];
            const fadeEffect = Math.pow(1 - distanceFromClusterCenter, 1.5); // 더 자연스러운 페이드
            const clusterOpacity = baseOpacity * fadeEffect * (0.6 + Math.random() * 0.4); // 투명도 변화
            
            // 날씨 상태에 따른 구름 색상 적용 (약간의 색상 변화 추가)
            const [r, g, b] = weatherState.colors.cloud;
            const colorVariation = 0.9 + Math.random() * 0.2; // 0.9-1.1 색상 변화
            const finalR = Math.min(255, r * colorVariation);
            const finalG = Math.min(255, g * colorVariation);
            const finalB = Math.min(255, b * colorVariation);
            
            // 더 큰 크기로 조정하여 겹침 효과 증대
            const sizeRandomness = Math.random();
            const baseSizeVariation = sizeRandomness < 0.3 ? 80 + Math.random() * 40 : // 30% 중간
                                     sizeRandomness < 0.7 ? 120 + Math.random() * 60 : // 40% 큰
                                     180 + Math.random() * 80; // 30% 매우 큰
            
            const sizeMultiplier = weatherState.id === 'heavy_rain' ? 1.2 : 
                                  weatherState.id === 'rainy' ? 1.1 :
                                  weatherState.id === 'cloudy' ? 1.0 : 
                                  weatherState.id === 'partly_cloudy' ? 0.8 : 0.7;
            
            particles.push({
              position: [
                point[0],
                point[1],
                altitude,
              ],
              size: baseSizeVariation * sizeMultiplier,
              density: cloudDensity,
              color: [finalR, finalG, finalB],
              opacity: Math.max(0.03, Math.min(0.8, clusterOpacity)), // 투명도 범위 제한
            });
          }
        }
      } catch (error) {
        console.warn('Error generating cloud particles for', station.name, error);
      }
    }
  });
  
  return particles;
};

// Generate rain particles based on precipitation within district boundaries
const generateRainParticles = (stations: WeatherStation[], geoJSON: SeoulGeoJSON): RainParticle[] => {
  const particles: RainParticle[] = [];
  let particleId = 0;
  
  if (!geoJSON) return particles;
  
  stations.forEach((station) => {
    // Get weather state and color configuration
    const weatherState = getWeatherState(station.weather.precipitation, station.weather.cloudCoverage);
    
    if (station.weather.precipitation > 0) {
      // 강수량에 비례한 빗방울 수 (날씨 상태에 따라 조정)
      const baseCount = station.weather.precipitation * 25;
      const stateMultiplier = weatherState.id === 'heavy_rain' ? 2.0 :
                             weatherState.id === 'rainy' ? 1.5 :
                             weatherState.id === 'cloudy' ? 1.2 : 1.0;
      const particleCount = Math.floor(baseCount * stateMultiplier);
      
      // 해당 구의 모든 동 features 찾기
      const districtFeatures = geoJSON.features.filter((f: SeoulDistrictFeature) => f.properties.sggnm === station.name);
      if (districtFeatures.length === 0) return;
      
      // 구 전체의 bbox 계산
      const districtCollection = turf.featureCollection(districtFeatures);
      const bbox = turf.bbox(districtCollection);
      
      for (let i = 0; i < particleCount; i++) {
        try {
          // bbox 내의 랜덤 포인트 생성하고, 실제 구역 내에 있는지 확인
          let point: [number, number] | null = null;
          
          for (let attempt = 0; attempt < 10; attempt++) {
            const randomPoint = turf.randomPoint(1, { bbox });
            const testPoint = randomPoint.features[0];
            
            // 해당 구의 어떤 동이라도 포함하는지 확인
            const isInDistrict = districtFeatures.some((feature) => 
              turf.booleanPointInPolygon(testPoint, feature)
            );
            
            if (isInDistrict) {
              point = testPoint.geometry.coordinates as [number, number];
              break;
            }
          }
          
          // 포인트를 찾지 못하면 bbox 중심 사용
          if (!point) {
            point = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
          }
          
          // 빗줄기를 표현하기 위해 다양한 시작 높이
          const startHeight = 500 + Math.random() * 2000;
          
          // 날씨 상태에 따른 비 속도와 크기 조정
          const velocity = weatherState.id === 'heavy_rain' ? -25 - Math.random() * 15 :
                          weatherState.id === 'rainy' ? -20 - Math.random() * 10 :
                          -15 - Math.random() * 8;
          const rainSize = weatherState.id === 'heavy_rain' ? 1.5 + Math.random() * 2 :
                          weatherState.id === 'rainy' ? 1.0 + Math.random() * 1.5 :
                          0.5 + Math.random() * 1;
          
          particles.push({
            id: `rain-${particleId++}`,
            position: [
              point[0],
              point[1],
              startHeight,
            ],
            velocity: [
              0,
              0,
              velocity,
            ],
            size: rainSize,
            lifetime: Math.random() * 3,
          });
        } catch (error: unknown) {
          console.error('Error generating rain particles:', error);
        }
      }
    }
  });
  
  return particles;
};

// Calculate weather effect configuration based on overall weather
const calculateWeatherEffects = (stations: WeatherStation[]) => {
  const avgPrecipitation = stations.reduce((sum, s) => sum + s.weather.precipitation, 0) / stations.length;
  const avgCloudCoverage = stations.reduce((sum, s) => sum + s.weather.cloudCoverage, 0) / stations.length;
  
  // 평균 날씨 상태 결정
  const overallWeatherState = getWeatherState(avgPrecipitation, avgCloudCoverage);
  
  // 날씨 상태에 따른 밝기와 대비 적용
  const { brightness, contrast } = overallWeatherState.colors.sky;
  
  // 조명 색상도 날씨 상태에 따라 조정
  const [ambientR, ambientG, ambientB] = overallWeatherState.colors.ambient;
  const ambientColor = [ambientR / 255, ambientG / 255, ambientB / 255];
  
  return { 
    brightness, 
    contrast,
    ambientColor,
    weatherState: overallWeatherState
  };
};

export default function WeatherVisualization() {
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 126.9780,  // 서울시청
    latitude: 37.5665,
    zoom: 10.5,
    pitch: 45,
    bearing: 0,
  });

  const [weatherStations] = useState<WeatherStation[]>(generateMockWeatherStations());
  const [cloudParticles, setCloudParticles] = useState<CloudParticle[]>([]);
  const [rainParticles, setRainParticles] = useState<RainParticle[]>([]);
  const [seoulGeoJSON, setSeoulGeoJSON] = useState<SeoulGeoJSON | null>(null);
  const [dongData, setDongData] = useState<DongInfo[]>([]);
  const [, setAnimationFrame] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  // Load Seoul GeoJSON data
  useEffect(() => {
    fetch('/data/hangjeongdong_서울특별시.geojson')
      .then(response => response.json())
      .then(data => setSeoulGeoJSON(data))
      .catch(error => console.error('Failed to load Seoul GeoJSON:', error));
  }, []);

  // Generate dong data when GeoJSON is loaded
  useEffect(() => {
    if (seoulGeoJSON && weatherStations.length > 0) {
      setDongData(generateDongData(seoulGeoJSON, weatherStations));
    }
  }, [seoulGeoJSON, weatherStations]);

  // Generate cloud and rain particles
  useEffect(() => {
    setCloudParticles(generateCloudParticles(weatherStations, seoulGeoJSON));
    setRainParticles(generateRainParticles(weatherStations, seoulGeoJSON ?? { features: [], type: 'FeatureCollection' }));
  }, [weatherStations, seoulGeoJSON]);

  // Animation loop for rain particles
  useEffect(() => {
    const animate = () => {
      setAnimationFrame(prev => prev + 1);
      
      // Update rain particles
      setRainParticles(prevParticles => {
        return prevParticles.map(particle => {
          const newAltitude = particle.position[2] + particle.velocity[2];
          
          // 땅에 닿으면 재생성
          if (newAltitude < 0) {
            // 간단하게 같은 위치에서 재생성
            return {
              ...particle,
              position: [
                particle.position[0],
                particle.position[1],
                500 + Math.random() * 2000,
              ] as [number, number, number],
            };
          }
          
          return {
            ...particle,
            position: [
              particle.position[0],  // 횡방향 이동 제거
              particle.position[1],  // 횡방향 이동 제거
              newAltitude,
            ] as [number, number, number],
          };
        });
      });
    };

    const intervalId = setInterval(animate, 50); // 20fps for smooth animation
    return () => clearInterval(intervalId);
  }, [weatherStations]);

  // Calculate lighting based on weather
  const lightingEffect = (() => {
    const weatherEffects = calculateWeatherEffects(weatherStations);
    
    // 날씨 상태에 따른 조명 색상 적용
    const ambientColor = weatherEffects.ambientColor.map(c => c * 255) as [number, number, number];
    
    const ambientLight = new AmbientLight({
      color: ambientColor,
      intensity: weatherEffects.brightness * 0.8,
    });

    const directionalLight = new DirectionalLight({
      color: ambientColor,
      intensity: weatherEffects.brightness * 1.0,
      direction: [-1, -3, -1],
    });

    return new LightingEffect({ ambientLight, directionalLight });
  })();

  const getLayers = useCallback(() => {
    const layers = [];

    // District boundary layer using GeoJSON - 비가 오는 구역 표시
    const rainingDistricts = weatherStations.filter(station => station.weather.precipitation > 0);
    
    if (rainingDistricts.length > 0 && seoulGeoJSON) {
      // 비가 오는 구역만 필터링한 GeoJSON 생성 (sggnm 속성 사용)
      const filteredFeatures = seoulGeoJSON.features.filter((feature: SeoulDistrictFeature) => 
        rainingDistricts.some(station => station.name === feature.properties.sggnm)
      );

      const rainingGeoJSON = {
        type: "FeatureCollection" as const,
        features: filteredFeatures.map((feature: SeoulDistrictFeature) => {
          const station = rainingDistricts.find(s => s.name === feature.properties.sggnm);
          return {
            ...feature,
            type: "Feature" as const,
            properties: {
              ...feature.properties,
              precipitation: station?.weather.precipitation || 0
            }
          };
        })
      };

      layers.push(
        new GeoJsonLayer({
          id: 'district-rain-areas',
          data: rainingGeoJSON,
          getFillColor: (f: { properties: { precipitation: number } }) => {
            // 강수량에 따른 색상과 투명도
            const intensity = Math.min(f.properties.precipitation / 30, 1);
            return [50, 100, 200, intensity * 80]; // 파란색, 투명도는 강수량에 비례
          },
          getLineColor: [80, 120, 200, 150],
          getLineWidth: 20,
          lineWidthMinPixels: 2,
          lineWidthMaxPixels: 5,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: false,
        })
      );
    }

    // Weather station layer 제거 - 행정구역으로 대체됨

    // Cloud layer - 다중 ScatterplotLayer로 부피감 표현
    if (cloudParticles.length > 0) {
      // 기본 구름 레이어 (원형을 활용한 부드러운 효과)
      layers.push(
        new ScatterplotLayer({
          id: 'clouds-base',
          data: cloudParticles,
          getPosition: (d: CloudParticle) => d.position,
          getFillColor: (d: CloudParticle) => [...d.color, d.opacity * 180],
          getRadius: (d: CloudParticle) => d.size,
          radiusUnits: 'meters',
          opacity: 0.6,
          radiusMinPixels: 20,
          radiusMaxPixels: 300,
          stroked: false,
          filled: true,
          antialiasing: true,
          billboard: true, // 항상 카메라를 향함
        })
      );
      
      // 고도에 따른 그림자 효과 (아래쪽에 더 어두운 레이어)
      layers.push(
        new ScatterplotLayer({
          id: 'clouds-shadow',
          data: cloudParticles.map(p => ({
            ...p,
            position: [p.position[0], p.position[1], p.position[2] - 300] as [number, number, number]
          })),
          getPosition: (d: CloudParticle) => d.position,
          getFillColor: (d: CloudParticle) => [
            d.color[0] * 0.6,
            d.color[1] * 0.6,
            d.color[2] * 0.6,
            d.opacity * 100
          ],
          getRadius: (d: CloudParticle) => d.size * 1.2,
          radiusUnits: 'meters',
          opacity: 0.3,
          radiusMinPixels: 25,
          radiusMaxPixels: 350,
          stroked: false,
          filled: true,
          antialiasing: true,
          billboard: true,
        })
      );
    }

    // Rain layer
    if (rainParticles.length > 0) {
      layers.push(
        new PointCloudLayer({
          id: 'rain',
          data: rainParticles,
          getPosition: (d: RainParticle) => d.position,
          getColor: [200, 210, 255, 120], // 더 연한 파란색 빗방울
          getNormal: [0, 0, -1],
          pointSize: 1, // 더 작은 빗방울
          opacity: 0.6,
        })
      );
    }

    return layers;
  }, [weatherStations, cloudParticles, rainParticles, seoulGeoJSON]);

  const handleHover = useCallback(({ x, y, object }: PickingInfo) => {
    if (object && 'properties' in object && 'precipitation' in object.properties) {
      // GeoJSON 구역 hover
      const district = object;
      const precipitation = district.properties.precipitation;
      const districtName = district.properties.sggnm;
      
      const weatherDesc = 
        precipitation > 20 ? '폭우' :
        precipitation > 10 ? '강한비' :
        precipitation > 5 ? '보통비' :
        precipitation > 1 ? '약한비' :
        precipitation > 0 ? '이슬비' : '강수 없음';

      const text = `${districtName}
날씨: ${weatherDesc}
강수량: ${precipitation.toFixed(1)}mm/h`;
      
      setTooltip({ x, y, text });
    } else {
      setTooltip(null);
    }
  }, []);

  // Handle region selection with district/dong center calculation
  const handleRegionSelect = useCallback((lng: number, lat: number, isDong?: boolean) => {
    const zoomLevel = isDong ? 14 : 12; // 동 단위일 때 더 확대
    
    setViewState({
      longitude: lng,
      latitude: lat,
      zoom: zoomLevel,
      pitch: 45,
      bearing: 0,
      transitionDuration: 1000,
      transitionInterpolator: new FlyToInterpolator(),
    });
  }, []);

  // Group dong data by gu for organized display
  const dongsByGu = dongData.reduce((acc, dong) => {
    if (!acc[dong.guName]) {
      acc[dong.guName] = [];
    }
    acc[dong.guName].push(dong);
    return acc;
  }, {} as Record<string, DongInfo[]>);

  return (
    <div className="relative w-full h-screen">
      <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg max-h-[calc(100vh-2rem)] overflow-y-auto w-80 max-w-[calc(100vw-2rem)]">
        <h2 className="text-xl font-bold mb-4">🌦️ 서울시 날씨 시각화</h2>
        
        {/* Region selector */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">📍 지역 선택</h3>
          <select 
            onChange={(e) => {
              if (e.target.value === "") {
                // 전체 보기
                setViewState({
                  longitude: 126.9780,
                  latitude: 37.5665,
                  zoom: 10.5,
                  pitch: 45,
                  bearing: 0,
                  transitionDuration: 1000,
                  transitionInterpolator: new FlyToInterpolator(),
                });
              } else {
                const [lng, lat, isDong] = e.target.value.split(',');
                handleRegionSelect(Number(lng), Number(lat), isDong === 'true');
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">🏙️ 전체 보기</option>
            
            {/* 구 단위 선택 */}
            <optgroup label="📍 구 단위">
              {weatherStations.map((station) => (
                <option 
                  key={station.id} 
                  value={`${station.location.longitude},${station.location.latitude},false`}
                >
                  {station.name} - {getWeatherDisplay(station)}
                </option>
              ))}
            </optgroup>

            {/* 동 단위 선택 */}
            {Object.keys(dongsByGu).sort().map((guName) => (
              <optgroup key={guName} label={`🏘️ ${guName}`}>
                {dongsByGu[guName].sort((a, b) => a.dongName.localeCompare(b.dongName)).map((dong) => (
                  <option 
                    key={`${dong.guName}-${dong.dongName}`}
                    value={`${dong.center[0]},${dong.center[1]},true`}
                  >
                    {dong.dongName} ({dong.guName}) - {getWeatherDisplay(dong.guWeatherStation)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <h3 className="font-semibold mb-2">날씨 상태 범례 (5단계)</h3>
          <div className="space-y-1 text-sm">
            {WEATHER_STATES.map((state) => (
              <div key={state.id} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{
                    backgroundColor: `rgb(${state.colors.cloud[0]}, ${state.colors.cloud[1]}, ${state.colors.cloud[2]})`,
                    opacity: state.colors.cloud[3]
                  }}
                ></div>
                <span>
                  {state.emoji} {state.name} ({state.precipitation[0]}-{state.precipitation[1]}mm/h)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-600">
          <p className="mb-2">🎨 5단계 날씨 상태별 색상 및 효과 차별화</p>
          <p className="mb-2">☁️ 구름: 색상/크기/투명도가 날씨에 따라 변화</p>
          <p className="mb-2">🌧️ 비: 속도/크기/밀도가 강수량에 비례</p>
          <p className="mb-2">💡 조명: 날씨 상태별 색온도 및 밝기 자동 조정</p>
          <p>🗺️ 지도: 하늘 밝기가 실시간 날씨를 반영</p>
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
          inertia: true,
        }}
        layers={getLayers()}
        effects={[lightingEffect]}
        onHover={handleHover}
      >
        <Map
          mapStyle="mapbox://styles/mapbox/light-v11"
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''}
        />
      </DeckGL>

      {tooltip && (
        <div
          className="absolute bg-black bg-opacity-90 text-white px-3 py-2 rounded pointer-events-none z-20 whitespace-pre-line"
          style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}