'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { DeckGL } from '@deck.gl/react';
import {
  PointCloudLayer,
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
    if (station.weather.cloudCoverage > 10) { // 구름이 있는 경우만
      const cloudDensity = station.weather.cloudCoverage / 100;
      const particleCount = Math.floor(cloudDensity * 300); // 행정구역에 맞게 조정
      
      // 해당 구역의 GeoJSON feature 찾기
      const districtFeature = geoJSON.features.find((f: SeoulDistrictFeature) => f.properties.sggnm === station.name);
      if (!districtFeature) return;
      
      try {
        const bbox = turf.bbox(districtFeature);
        
        for (let i = 0; i < particleCount; i++) {
          // 구역 내 랜덤 포인트 생성
          let point: [number, number] | null = null;
          
          // 최대 5번 시도
          for (let attempt = 0; attempt < 5; attempt++) {
            const randomPoint = turf.randomPoint(1, { bbox });
            if (turf.booleanPointInPolygon(randomPoint.features[0], districtFeature)) {
              point = randomPoint.features[0].geometry.coordinates as [number, number];
              break;
            }
          }
          
          // 포인트를 찾지 못하면 bbox 중심점 사용
          if (!point) {
            point = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
          }
          
          // 구름 고도: 강수량이 많을수록 낮은 구름
          const baseAltitude = 1500 - (station.weather.precipitation * 30);
          const altitude = baseAltitude + Math.random() * 600;
          
          // 구름 중심부에서 멀어질수록 투명도 감소
          const distanceFromCenter = Math.random();
          const baseOpacity = 0.12 + cloudDensity * 0.25;
          const edgeOpacity = baseOpacity * (1 - distanceFromCenter * 0.6);
          
          // 구름 색상: 강수량에 따라 어두워짐
          const brightness = Math.max(150, 255 - station.weather.precipitation * 5);
          
          particles.push({
            position: [
              point[0],
              point[1],
              altitude,
            ],
            size: 80 + Math.random() * 160,
            density: cloudDensity,
            color: [brightness, brightness, brightness + 12],
            opacity: edgeOpacity,
          });
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
    if (station.weather.precipitation > 0) {
      // 강수량에 비례한 빗방울 수 (더 많이)
      const particleCount = Math.floor(station.weather.precipitation * 30);
      
      for (let i = 0; i < particleCount; i++) {
        // 해당 구역의 GeoJSON feature 찾기 (sggnm 속성 사용)
        const districtFeature = geoJSON.features.find((f: SeoulDistrictFeature) => f.properties.sggnm === station.name);
        if (!districtFeature) {
          // fallback: 스테이션 주변에 랜덤 포인트 생성
          particles.push({
            id: `rain-${particleId++}`,
            position: [
              station.location.longitude + (Math.random() - 0.5) * 0.01,
              station.location.latitude + (Math.random() - 0.5) * 0.01,
              500 + Math.random() * 2000,
            ],
            velocity: [0, 0, -15 - Math.random() * 10],
            size: 0.5 + Math.random() * 1,
            lifetime: Math.random() * 3,
          });
          continue;
        }
        
        try {
          // turf.js를 사용하여 폴리곤 내부의 랜덤 포인트 생성
          const bbox = turf.bbox(districtFeature);
          let point: [number, number] | null = null;
          
          // 최대 10번 시도
          for (let attempt = 0; attempt < 10; attempt++) {
            const randomPoint = turf.randomPoint(1, { bbox });
            if (turf.booleanPointInPolygon(randomPoint.features[0], districtFeature)) {
              point = randomPoint.features[0].geometry.coordinates as [number, number];
              break;
            }
          }
          
          // 포인트를 찾지 못하면 스테이션 위치 사용
          if (!point) {
            point = [station.location.longitude, station.location.latitude];
          }
          
          // 빗줄기를 표현하기 위해 다양한 시작 높이
          const startHeight = 500 + Math.random() * 2000;
          
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
              -15 - Math.random() * 10, // 더 빠른 낙하 속도
            ],
            size: 0.5 + Math.random() * 1, // 더 작은 빗방울
            lifetime: Math.random() * 3,
          });
        } catch (error: unknown) {
          console.error('Error generating rain particles:', error);
          // 에러 발생 시 스테이션 주변에 생성
          particles.push({
            id: `rain-${particleId++}`,
            position: [
              station.location.longitude + (Math.random() - 0.5) * 0.01,
              station.location.latitude + (Math.random() - 0.5) * 0.01,
              500 + Math.random() * 2000,
            ],
            velocity: [0, 0, -15 - Math.random() * 10],
            size: 0.5 + Math.random() * 1,
            lifetime: Math.random() * 3,
          });
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
  
  // 날씨에 따른 밝기와 대비 조정
  let brightness = 1.0;
  let contrast = 1.0;
  
  if (avgPrecipitation > 20) {
    // 강한 비
    brightness = 0.4;
    contrast = 0.6;
  } else if (avgPrecipitation > 5) {
    // 보통 비
    brightness = 0.6;
    contrast = 0.7;
  } else if (avgPrecipitation > 1) {
    // 약한 비
    brightness = 0.8;
    contrast = 0.85;
  } else if (avgCloudCoverage > 50) {
    // 흐림
    brightness = 0.85;
    contrast = 0.9;
  }
  
  return { brightness, contrast };
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
    
    const ambientLight = new AmbientLight({
      color: [255, 255, 255],
      intensity: weatherEffects.brightness,
    });

    const directionalLight = new DirectionalLight({
      color: [255, 255, 255],
      intensity: weatherEffects.brightness * 1.2,
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

    // Cloud layer
    if (cloudParticles.length > 0) {
      layers.push(
        new PointCloudLayer({
          id: 'clouds',
          data: cloudParticles,
          getPosition: (d: CloudParticle) => d.position,
          getColor: (d: CloudParticle) => [...d.color, d.opacity * 255],
          getNormal: [0, 0, 1],
          pointSize: 15, // 더 큰 포인트 크기
          opacity: 0.4, // 전체적으로 낮은 투명도로 겹침 효과
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
                  {station.name} - {
                    station.weather.precipitation > 20 ? '폭우 🌧️' :
                    station.weather.precipitation > 10 ? '강한비 🌧️' :
                    station.weather.precipitation > 5 ? '보통비 🌦️' :
                    station.weather.precipitation > 1 ? '약한비 🌦️' :
                    station.weather.cloudCoverage > 50 ? '흐림 ☁️' :
                    station.weather.cloudCoverage > 30 ? '구름조금 ⛅' : '맑음 ☀️'
                  }
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
                    {dong.dongName} ({dong.guName}) - {
                      dong.guWeatherStation.weather.precipitation > 20 ? '폭우 🌧️' :
                      dong.guWeatherStation.weather.precipitation > 10 ? '강한비 🌧️' :
                      dong.guWeatherStation.weather.precipitation > 5 ? '보통비 🌦️' :
                      dong.guWeatherStation.weather.precipitation > 1 ? '약한비 🌦️' :
                      dong.guWeatherStation.weather.cloudCoverage > 50 ? '흐림 ☁️' :
                      dong.guWeatherStation.weather.cloudCoverage > 30 ? '구름조금 ⛅' : '맑음 ☀️'
                    }
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <h3 className="font-semibold mb-2">날씨 상태 범례</h3>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 rounded"></div>
              <span>맑음 (강수량 0mm)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-300 rounded"></div>
              <span>약한비 (1-5mm)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>강한비 (10mm 이상)</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-600">
          <p className="mb-2">💡 구름의 밀도와 높이는 강수량에 따라 변합니다.</p>
          <p className="mb-2">🌧️ 비 파티클은 실시간으로 애니메이션됩니다.</p>
          <p>☀️ 하늘 밝기는 날씨 상태를 반영합니다.</p>
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