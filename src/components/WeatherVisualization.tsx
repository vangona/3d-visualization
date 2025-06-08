'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { DeckGL } from '@deck.gl/react';
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
import { SeoulGeoJSON } from '@/data/seoul-geojson-loader';

// Import types
import { CloudParticle, RainParticle, DongInfo } from '@/types/weather';

// Import constants
import { WEATHER_STATES } from '@/constants/weather';

// Import utilities
import { getWeatherDisplay, calculateWeatherEffects } from '@/utils/weather';
import { generateMockWeatherStations, generateDongData } from '@/utils/dataGenerators';
import { generateCloudParticles, generateRainParticles } from '@/utils/particleGenerators';
import { createDistrictRainLayer, createCloudBaseLayer, createCloudHighlightLayer, createRainLayer, createWeatherColumnLayer } from '@/utils/layerGenerators';
import { createSimple3DBuildingLayer } from '@/utils/simpleBuildingLayer';

export default function WeatherVisualization() {
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 126.9780,  // 서울시청
    latitude: 37.5665,
    zoom: 10.5, // 원기둥이 보이도록 줌 조정
    pitch: 60, // 3D 건물이 잘 보이도록 각도 증가
    bearing: 0,
  });

  const weatherStations = useMemo(() => generateMockWeatherStations(), []);
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

  // Generate cloud particles with useMemo for better performance
  const cloudParticlesMemo = useMemo(() => {
    return generateCloudParticles(weatherStations, seoulGeoJSON);
  }, [weatherStations, seoulGeoJSON]);

  // Update cloud particles when memoized particles change
  useEffect(() => {
    setCloudParticles(cloudParticlesMemo);
  }, [cloudParticlesMemo]);

  // Generate initial rain particles when weather data changes (not on every viewState change)
  useEffect(() => {
    if (weatherStations.length > 0 && seoulGeoJSON) {
      const initialRainParticles = generateRainParticles(weatherStations, seoulGeoJSON, viewState);
      setRainParticles(initialRainParticles);
    }
  }, [weatherStations, seoulGeoJSON]); // Remove viewState dependencies to prevent regeneration on pan/zoom

  // Animation loop for rain particles
  useEffect(() => {
    let frameCount = 0;
    
    const animate = () => {
      setAnimationFrame(prev => prev + 1);
      frameCount++;
      
      // Update rain particles
      setRainParticles(prevParticles => {
        if (prevParticles.length === 0) {
          console.log('Warning: No rain particles to animate');
        }
        
        // Log particle count every 100 frames (5 seconds)
        if (frameCount % 100 === 0) {
          console.log(`Rain particles count: ${prevParticles.length}`);
        }
        
        return prevParticles.map(particle => {
          const newAltitude = particle.position[2] + particle.velocity[2];
          
          // 땅에 닿으면 항상 재생성 (파티클 수 유지)
          if (newAltitude < 0) {
            return {
              ...particle,
              position: [
                particle.position[0],
                particle.position[1],
                300 + Math.random() * 1200, // 구름보다 낮은 고도에서 재생성
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
      color: [255, 255, 255], // 원기둥이 잘 보이도록 흰색 조명
      intensity: Math.max(0.7, weatherEffects.brightness * 0.8), // 최소 밝기 보장
    });

    const directionalLight = new DirectionalLight({
      color: [255, 255, 255], // 원기둥이 잘 보이도록 흰색 조명
      intensity: Math.max(0.8, weatherEffects.brightness * 1.0), // 최소 밝기 보장
      direction: [-1, -3, -1],
    });

    return new LightingEffect({ ambientLight, directionalLight });
  })();

  const layers = useMemo(() => {
    const layerList = [];
    const currentZoom = viewState.zoom;

    console.log('Creating layers for zoom level:', currentZoom);

    // Weather column layer for overview (zoom <= 11)
    const columnLayer = createWeatherColumnLayer(weatherStations, seoulGeoJSON, currentZoom);
    if (columnLayer) {
      layerList.push(columnLayer);
      console.log('Added weather column layer at zoom:', currentZoom);
    }

    // District area layer (always visible for context)
    const districtLayer = createDistrictRainLayer(weatherStations, seoulGeoJSON);
    if (districtLayer) {
      layerList.push(districtLayer);
      console.log('Added district layer');
    }

    // Particle layers (zoom 11-14 for gradual appearance)
    if (currentZoom >= 11 && currentZoom < 15) {
      // Calculate opacity based on zoom level for smooth transition
      const particleOpacity = Math.min(1, (currentZoom - 11) / 2); // 0 at zoom 11, 1 at zoom 13+
      
      // Cloud layers with zoom-based opacity
      if (cloudParticles.length > 0 && particleOpacity > 0) {
        layerList.push(createCloudBaseLayer(cloudParticles, currentZoom));
        layerList.push(createCloudHighlightLayer(cloudParticles, currentZoom));
        console.log('Added cloud layers with opacity:', particleOpacity, 'zoom:', currentZoom);
      }

      // Rain layer with zoom-based opacity and viewport filtering
      if (rainParticles.length > 0 && particleOpacity > 0) {
        layerList.push(createRainLayer(rainParticles, { 
          longitude: viewState.longitude, 
          latitude: viewState.latitude, 
          zoom: currentZoom 
        }));
        console.log('Added rain layer with', rainParticles.length, 'particles at zoom:', currentZoom);
      }
    }

    // Simple 3D buildings (zoom >= 13)
    if (currentZoom >= 13) {
      const simpleBuildingLayer = createSimple3DBuildingLayer(weatherStations, currentZoom);
      if (simpleBuildingLayer) {
        layerList.push(simpleBuildingLayer);
        console.log('Added simple 3D building layer');
      }
    }

    // MVT layers for building/road detail (zoom >= 15) - 일시적으로 비활성화
    // if (currentZoom >= 15) {
    //   const mvtLayers = createAllMVTLayers(weatherStations, currentZoom);
    //   layerList.push(...mvtLayers);
    //   console.log('Added', mvtLayers.length, 'MVT layers for building/road detail');
    // }

    console.log('Total layers created:', layerList.length);
    return layerList;
  }, [
    weatherStations, 
    seoulGeoJSON,
    cloudParticles,
    rainParticles,
    viewState.zoom,
    viewState.longitude,
    viewState.latitude
  ]);

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
          <p className="mb-2">🎨 5단계 날씨 상태별 효과 차별화</p>
          <p className="mb-2">🗺️ 구역: 비오는 곳(파란색), 맑은 곳(노란색)</p>
          <p className="mb-2">☁️ 구름: 날씨에 따라 구름의 양(밀도)이 변화</p>
          <p className="mb-2">🌧️ 비: 속도/크기/밀도가 강수량에 비례</p>
          <p>💡 조명: 날씨 상태별 밝기 자동 조정</p>
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
        layers={layers}
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