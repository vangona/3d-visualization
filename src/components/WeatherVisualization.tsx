'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { DeckGL } from '@deck.gl/react';
import {
  ScatterplotLayer,
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

// Mock weather stations data for Seoul
const generateMockWeatherStations = (): WeatherStation[] => {
  const seoulDistricts = [
    { name: '강남구', lng: 127.0474, lat: 37.5172 },
    { name: '서초구', lng: 127.0327, lat: 37.4837 },
    { name: '송파구', lng: 127.1056, lat: 37.5145 },
    { name: '강서구', lng: 126.8497, lat: 37.5509 },
    { name: '마포구', lng: 126.9016, lat: 37.5664 },
    { name: '중구', lng: 126.9980, lat: 37.5636 },
    { name: '노원구', lng: 127.0568, lat: 37.6542 },
    { name: '강동구', lng: 127.1238, lat: 37.5301 },
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

// Generate cloud particles based on weather data
const generateCloudParticles = (stations: WeatherStation[]): CloudParticle[] => {
  const particles: CloudParticle[] = [];
  
  stations.forEach((station) => {
    const cloudDensity = station.weather.cloudCoverage / 100;
    const particleCount = Math.floor(cloudDensity * 500); // 더 많은 파티클로 부드러운 구름
    
    for (let i = 0; i < particleCount; i++) {
      // 구름 고도: 강수량이 많을수록 낮은 구름
      const baseAltitude = 1500 - (station.weather.precipitation * 50);
      const altitude = baseAltitude + Math.random() * 800;
      
      // 구름 중심부에서 멀어질수록 투명도 감소
      const distanceFromCenter = Math.random(); // 0 = 중심, 1 = 가장자리
      const baseOpacity = 0.15 + cloudDensity * 0.3;
      const edgeOpacity = baseOpacity * (1 - distanceFromCenter * 0.7);
      
      // 구름 색상: 강수량에 따라 어두워짐
      const brightness = Math.max(140, 255 - station.weather.precipitation * 6);
      
      // 가우시안 분포로 더 자연스러운 구름 형태
      const gaussianX = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      const gaussianY = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      
      particles.push({
        position: [
          station.location.longitude + gaussianX * 0.03,
          station.location.latitude + gaussianY * 0.03,
          altitude,
        ],
        size: 100 + Math.random() * 200, // 더 큰 파티클
        density: cloudDensity,
        color: [brightness, brightness, brightness + 15],
        opacity: edgeOpacity,
      });
    }
  });
  
  return particles;
};

// Generate rain particles based on precipitation
const generateRainParticles = (stations: WeatherStation[]): RainParticle[] => {
  const particles: RainParticle[] = [];
  let particleId = 0;
  
  stations.forEach((station) => {
    if (station.weather.precipitation > 0) {
      // 강수량에 비례한 빗방울 수 (더 많이)
      const particleCount = Math.floor(station.weather.precipitation * 50);
      
      for (let i = 0; i < particleCount; i++) {
        // 빗줄기를 표현하기 위해 다양한 시작 높이
        const startHeight = 500 + Math.random() * 2000;
        
        particles.push({
          id: `rain-${particleId++}`,
          position: [
            station.location.longitude + (Math.random() - 0.5) * 0.02,
            station.location.latitude + (Math.random() - 0.5) * 0.02,
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
  const [, setAnimationFrame] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  // Generate cloud and rain particles
  useEffect(() => {
    setCloudParticles(generateCloudParticles(weatherStations));
    setRainParticles(generateRainParticles(weatherStations));
  }, [weatherStations]);

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
            return {
              ...particle,
              position: [
                particle.position[0],
                particle.position[1],
                500 + Math.random() * 2000, // 빗방울 재생성 높이도 수정
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
  }, []);

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

    // Weather station layer
    layers.push(
      new ScatterplotLayer({
        id: 'weather-stations',
        data: weatherStations,
        getPosition: (d: WeatherStation) => [d.location.longitude, d.location.latitude],
        getFillColor: (d: WeatherStation) => {
          // 강수량에 따른 색상
          if (d.weather.precipitation > 10) return [100, 100, 200]; // 진한 파랑
          if (d.weather.precipitation > 1) return [150, 150, 255]; // 연한 파랑
          return [255, 200, 100]; // 노랑 (맑음)
        },
        getRadius: 3000,
        radiusMinPixels: 10,
        radiusMaxPixels: 50,
        pickable: true,
        opacity: 0.8,
      })
    );

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
  }, [weatherStations, cloudParticles, rainParticles]);

  const handleHover = useCallback(({ x, y, object }: PickingInfo) => {
    if (object && 'weather' in object) {
      const station = object as WeatherStation;
      const weather = station.weather;
      const weatherDesc = 
        weather.precipitation > 20 ? '폭우' :
        weather.precipitation > 10 ? '강한비' :
        weather.precipitation > 5 ? '보통비' :
        weather.precipitation > 1 ? '약한비' :
        weather.cloudCoverage > 50 ? '흐림' :
        weather.cloudCoverage > 30 ? '구름조금' : '맑음';

      const text = `${station.name}
날씨: ${weatherDesc}
강수량: ${weather.precipitation.toFixed(1)}mm/h
온도: ${weather.temperature.toFixed(1)}°C
습도: ${weather.humidity.toFixed(0)}%
풍속: ${weather.windSpeed.toFixed(1)}m/s`;
      
      setTooltip({ x, y, text });
    } else {
      setTooltip(null);
    }
  }, []);

  // Handle region selection
  const handleRegionSelect = useCallback((lng: number, lat: number) => {
    setViewState({
      longitude: lng,
      latitude: lat,
      zoom: 12,
      pitch: 45,
      bearing: 0,
      transitionDuration: 1000,
      transitionInterpolator: new FlyToInterpolator(),
    });
  }, []);

  return (
    <div className="relative w-full h-screen">
      <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg max-h-[calc(100vh-2rem)] overflow-y-auto w-80 max-w-[calc(100vw-2rem)]">
        <h2 className="text-xl font-bold mb-4">🌦️ 서울시 날씨 시각화</h2>
        
        {/* Region selector */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">📍 지역 선택</h3>
          <select 
            onChange={(e) => {
              const [lng, lat] = e.target.value.split(',').map(Number);
              if (lng && lat) handleRegionSelect(lng, lat);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 보기</option>
            {weatherStations.map((station) => (
              <option 
                key={station.id} 
                value={`${station.location.longitude},${station.location.latitude}`}
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