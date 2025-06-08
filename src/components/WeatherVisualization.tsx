'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
  const [, setDongData] = useState<DongInfo[]>([]);
  const [, setAnimationFrame] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'location' | 'layers' | 'info'>('location');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<'all' | 'weather' | 'buildings' | 'districts'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteRegions, setFavoriteRegions] = useState<string[]>(['강남구', '종로구']);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<string>('');

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

  // Generate rain particles when weather data changes or significant zoom change
  const previousZoomRef = useRef(viewState.zoom);
  const hasInitializedRef = useRef(false);
  
  useEffect(() => {
    if (weatherStations.length > 0 && seoulGeoJSON) {
      const currentZoom = viewState.zoom;
      const previousZoom = previousZoomRef.current;
      
      // Regenerate particles only on major zoom threshold changes
      const shouldRegenerate = 
        !hasInitializedRef.current || // Initial load
        (previousZoom < 12 && currentZoom >= 12) || // Entering particle view
        (previousZoom >= 12 && currentZoom < 12) || // Leaving particle view
        (previousZoom < 14 && currentZoom >= 14) || // Entering high detail
        (previousZoom >= 14 && currentZoom < 14) || // Leaving high detail
        Math.abs(currentZoom - previousZoom) > 5; // Only on very large zoom changes
      
      if (shouldRegenerate) {
        console.log('Regenerating rain particles for zoom change:', previousZoom, '->', currentZoom);
        const newRainParticles = generateRainParticles(weatherStations, seoulGeoJSON, viewState);
        setRainParticles(newRainParticles);
        previousZoomRef.current = currentZoom;
        hasInitializedRef.current = true;
      }
    }
  }, [weatherStations, seoulGeoJSON, viewState.zoom]); // Remove rainParticles.length dependency

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

  // Smoothed zoom for layer generation to prevent stuttering
  const smoothedZoom = useMemo(() => {
    // Use smaller rounding intervals for smoother transitions
    return Math.round(viewState.zoom * 4) / 4; // 0.25 intervals instead of 0.5
  }, [viewState.zoom]);

  const layers = useMemo(() => {
    const layerList = [];
    const currentZoom = smoothedZoom;

    console.log('Creating layers for zoom level:', currentZoom, 'selectedLayer:', selectedLayer);

    // Weather column layer for overview (zoom <= 11)
    if (selectedLayer === 'all' || selectedLayer === 'weather') {
      const columnLayer = createWeatherColumnLayer(weatherStations, seoulGeoJSON, currentZoom);
      if (columnLayer) {
        layerList.push(columnLayer);
        console.log('Added weather column layer at zoom:', currentZoom);
      }
    }

    // District area layer (always visible for context unless specifically filtered)
    if (selectedLayer === 'all' || selectedLayer === 'districts') {
      const districtLayer = createDistrictRainLayer(weatherStations, seoulGeoJSON);
      if (districtLayer) {
        layerList.push(districtLayer);
        console.log('Added district layer');
      }
    }

    // Particle layers (zoom 11+ for weather effects)
    if ((selectedLayer === 'all' || selectedLayer === 'weather') && currentZoom >= 11) {
      // Calculate opacity based on zoom level for smooth transition
      const particleOpacity = Math.min(1, (currentZoom - 11) / 2); // 0 at zoom 11, 1 at zoom 13+
      
      // Cloud layers with zoom-based opacity (up to zoom 16)
      if (cloudParticles.length > 0 && particleOpacity > 0 && currentZoom < 16) {
        layerList.push(createCloudBaseLayer(cloudParticles, currentZoom));
        layerList.push(createCloudHighlightLayer(cloudParticles, currentZoom));
        console.log('Added cloud layers with opacity:', particleOpacity, 'zoom:', currentZoom);
      }

      // Rain layer - visible at all zoom levels once activated
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
    if ((selectedLayer === 'all' || selectedLayer === 'buildings') && currentZoom >= 13) {
      const simpleBuildingLayer = createSimple3DBuildingLayer(weatherStations, currentZoom);
      if (simpleBuildingLayer) {
        layerList.push(simpleBuildingLayer);
        console.log('Added simple 3D building layer');
      }
    }

    console.log('Total layers created:', layerList.length);
    return layerList;
  }, [
    weatherStations, 
    seoulGeoJSON,
    cloudParticles,
    rainParticles,
    smoothedZoom, // Use smoothed zoom instead of raw zoom
    viewState.longitude,
    viewState.latitude,
    selectedLayer
  ]);

  const handleHover = useCallback(({ x, y, object }: PickingInfo) => {
    if (object && 'properties' in object) {
      let tooltipContent = null;
      
      // GeoJSON 구역 hover
      if ('precipitation' in object.properties) {
        const district = object;
        const precipitation = district.properties.precipitation;
        const districtName = district.properties.sggnm;
        
        const weatherDesc = 
          precipitation > 20 ? '폭우' :
          precipitation > 10 ? '강한비' :
          precipitation > 5 ? '보통비' :
          precipitation > 1 ? '약한비' :
          precipitation > 0 ? '이슬비' : '맑음';

        const weatherEmoji = 
          precipitation > 20 ? '🌧️' :
          precipitation > 10 ? '🌦️' :
          precipitation > 5 ? '🌧️' :
          precipitation > 1 ? '🌦️' :
          precipitation > 0 ? '🌦️' : '☀️';

        tooltipContent = (
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl p-3 max-w-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{weatherEmoji}</span>
              <span className="font-semibold text-gray-900">{districtName}</span>
            </div>
            <div className="space-y-1 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>날씨:</span>
                <span className="font-medium">{weatherDesc}</span>
              </div>
              <div className="flex justify-between">
                <span>강수량:</span>
                <span className="font-medium">{precipitation.toFixed(1)}mm/h</span>
              </div>
            </div>
          </div>
        );
      }
      // 건물 hover
      else if ('name' in object.properties && 'height' in object.properties) {
        const building = object;
        tooltipContent = (
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl p-3 max-w-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🏢</span>
              <span className="font-semibold text-gray-900">{building.properties.name}</span>
            </div>
            <div className="text-sm text-gray-700">
              <div className="flex justify-between">
                <span>높이:</span>
                <span className="font-medium">{building.properties.height}m</span>
              </div>
            </div>
          </div>
        );
      }
      
      if (tooltipContent) {
        setTooltip({ x, y, content: tooltipContent });
      } else {
        setTooltip(null);
      }
    } else {
      setTooltip(null);
    }
  }, []);

  // Natural and meaningful region navigation
  const handleRegionSelect = useCallback((lng: number, lat: number, regionName: string, isDong?: boolean) => {
    setIsTransitioning(true);
    setTransitionTarget(regionName);
    
    // Calculate current distance to determine transition style
    const currentLng = viewState.longitude;
    const currentLat = viewState.latitude;
    const distance = Math.sqrt(Math.pow(lng - currentLng, 2) + Math.pow(lat - currentLat, 2));
    
    // For nearby regions: gentle direct transition
    if (distance < 0.05) {
      const finalZoom = isDong ? 15 : 13;
      setViewState({
        longitude: lng,
        latitude: lat,
        zoom: finalZoom,
        pitch: 55,
        bearing: 0,
        transitionDuration: 1200,
        transitionInterpolator: new FlyToInterpolator(),
      });
      
      setTimeout(() => {
        setIsTransitioning(false);
        setTransitionTarget('');
      }, 1300);
    } 
    // For distant regions: meaningful pullback to show Seoul context
    else {
      // Phase 1: Pull back to show Seoul context (birds-eye view)
      setViewState(prev => ({
        ...prev,
        zoom: 10,
        pitch: 30,
        bearing: 0,
        transitionDuration: 800,
        transitionInterpolator: new FlyToInterpolator(),
      }));
      
      // Phase 2: Move to target region with context understanding
      setTimeout(() => {
        const finalZoom = isDong ? 15 : 13;
        setViewState({
          longitude: lng,
          latitude: lat,
          zoom: finalZoom,
          pitch: 55,
          bearing: 0,
          transitionDuration: 1000,
          transitionInterpolator: new FlyToInterpolator(),
        });
      }, 900);
      
      setTimeout(() => {
        setIsTransitioning(false);
        setTransitionTarget('');
      }, 2000);
    }
  }, [viewState.longitude, viewState.latitude]);

  // Handle favorite toggle
  const toggleFavorite = useCallback((regionName: string) => {
    setFavoriteRegions(prev => 
      prev.includes(regionName) 
        ? prev.filter(name => name !== regionName)
        : [...prev, regionName]
    );
  }, []);

  // Filter regions based on search
  const filteredStations = useMemo(() => {
    if (!searchQuery) return weatherStations;
    return weatherStations.filter(station => 
      station.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [weatherStations, searchQuery]);

  // Group dong data by gu for organized display (currently unused)
  // const dongsByGu = dongData.reduce((acc, dong) => {
  //   if (!acc[dong.guName]) {
  //     acc[dong.guName] = [];
  //   }
  //   acc[dong.guName].push(dong);
  //   return acc;
  // }, {} as Record<string, DongInfo[]>);

  return (
    <div className="relative w-full h-screen">
      {/* Main Control Panel */}
      <div className={`absolute top-4 left-4 z-10 bg-white rounded-xl shadow-2xl border border-gray-200 transition-all duration-300 ${
        isCollapsed ? 'w-14 h-14' : 'w-96 max-w-[calc(100vw-2rem)] sm:w-80 md:w-96'
      }`}>
        
        {/* Header with Toggle */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">🌦️</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">서울시 날씨</h2>
                <p className="text-xs text-gray-500">3D 시각화</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            {isCollapsed ? '📍' : '−'}
          </button>
        </div>

        {!isCollapsed && (
          <>
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-100">
              {[
                { id: 'location' as const, icon: '📍', label: '위치' },
                { id: 'layers' as const, icon: '🎛️', label: '레이어' },
                { id: 'info' as const, icon: 'ℹ️', label: '정보' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-blue-600 bg-blue-50'
                      : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-1">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              
              {/* Location Tab */}
              {activeTab === 'location' && (
                <div className="space-y-4">
                  {/* Search and Quick Actions */}
                  <div className="space-y-3">
                    {/* Search Bar */}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 text-sm">🔍</span>
                      </div>
                      <input
                        type="text"
                        placeholder="구 이름으로 검색... (예: 강남, 종로)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setIsTransitioning(true);
                          setViewState({
                            longitude: 126.9780, latitude: 37.5665, zoom: 10.5, pitch: 45, bearing: 0,
                            transitionDuration: 1000, transitionInterpolator: new FlyToInterpolator(),
                          });
                          setTimeout(() => setIsTransitioning(false), 1100);
                        }}
                        className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm"
                      >
                        🏙️ 서울 전체
                      </button>
                      <button
                        onClick={() => setViewState(prev => ({ ...prev, pitch: (prev.pitch || 0) > 45 ? 0 : 60, transitionDuration: 500 }))}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all"
                      >
                        📐 시점 변경
                      </button>
                    </div>
                  </div>

                  {/* Transition Status */}
                  {isTransitioning && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-blue-700 font-medium">{transitionTarget} 탐색 중</span>
                      </div>
                      <div className="text-xs text-blue-600 mt-1">날씨 상황과 3D 지형을 확인해보세요</div>
                    </div>
                  )}

                  {/* Favorites Section */}
                  {favoriteRegions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-700">⭐ 즐겨찾기</span>
                        <span className="text-xs text-gray-500">({favoriteRegions.length}개)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {favoriteRegions.map((regionName) => {
                          const station = weatherStations.find(s => s.name === regionName);
                          if (!station) return null;
                          return (
                            <button
                              key={regionName}
                              onClick={() => handleRegionSelect(
                                station.location.longitude, 
                                station.location.latitude, 
                                regionName, 
                                false
                              )}
                              className="p-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg text-left hover:from-yellow-100 hover:to-orange-100 transition-all group"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{regionName}</div>
                                  <div className="text-xs text-gray-600">{getWeatherDisplay(station)}</div>
                                </div>
                                <div className="text-yellow-500 group-hover:text-yellow-600">⭐</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Region Cards */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        🗺️ 서울 25개 구 
                        {searchQuery && ` (검색: ${filteredStations.length}개)`}
                      </span>
                    </div>
                    
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {filteredStations.map((station) => {
                        const isFavorite = favoriteRegions.includes(station.name);
                        const weatherColor = 
                          station.weather.precipitation > 10 ? 'from-blue-500 to-blue-600' :
                          station.weather.precipitation > 1 ? 'from-blue-400 to-blue-500' :
                          station.weather.cloudCoverage > 50 ? 'from-gray-400 to-gray-500' : 'from-yellow-400 to-yellow-500';
                        
                        return (
                          <div
                            key={station.id}
                            className="group bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => handleRegionSelect(
                              station.location.longitude, 
                              station.location.latitude, 
                              station.name, 
                              false
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${weatherColor}`}></div>
                                  <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {station.name}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600">
                                  {getWeatherDisplay(station)} • 줌인하여 3D 탐색
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(station.name);
                                  }}
                                  className={`p-1 rounded transition-colors ${
                                    isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-300 hover:text-yellow-400'
                                  }`}
                                >
                                  ⭐
                                </button>
                                <div className="text-blue-500 group-hover:text-blue-600 group-hover:translate-x-1 transition-all">
                                  →
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Current Location Info */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-3 border border-gray-200">
                    <div className="text-xs text-gray-600 mb-1">📍 현재 카메라 위치</div>
                    <div className="text-sm font-medium text-gray-900">
                      경도: {viewState.longitude.toFixed(4)}°, 위도: {viewState.latitude.toFixed(4)}°
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      줌: {viewState.zoom.toFixed(1)} | 각도: {viewState.pitch}° | 방향: {(viewState.bearing || 0).toFixed(0)}°
                    </div>
                  </div>
                </div>
              )}

              {/* Layers Tab */}
              {activeTab === 'layers' && (
                <div className="space-y-4">
                  {/* Layer Controls */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">표시할 레이어</label>
                    <div className="space-y-2">
                      {[
                        { id: 'all' as const, icon: '🌍', label: '모든 레이어', desc: '전체 시각화 표시' },
                        { id: 'weather' as const, icon: '🌦️', label: '날씨 효과', desc: '구름, 비 파티클' },
                        { id: 'buildings' as const, icon: '🏢', label: '3D 건물', desc: '건물 3차원 모델' },
                        { id: 'districts' as const, icon: '🗺️', label: '행정구역', desc: '구역별 경계선' }
                      ].map((layer) => (
                        <label key={layer.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name="layer"
                            value={layer.id}
                            checked={selectedLayer === layer.id}
                            onChange={(e) => setSelectedLayer(e.target.value as typeof selectedLayer)}
                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span>{layer.icon}</span>
                              <span className="text-sm font-medium text-gray-900">{layer.label}</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{layer.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Zoom Level Info */}
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-blue-900 mb-2">줌 레벨별 시각화</div>
                    <div className="space-y-1 text-xs text-blue-800">
                      <div>📊 줌 ≤11: 구별 통계 원기둥</div>
                      <div>☁️ 줌 11-14: 구름 & 비 파티클</div>
                      <div>🏢 줌 ≥13: 3D 건물 모델</div>
                      <div className="text-blue-600 font-medium mt-2">
                        현재: 줌 {viewState.zoom.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Tab */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  {/* Weather Legend */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">날씨 상태 범례</h3>
                    <div className="space-y-2">
                      {WEATHER_STATES.map((state) => (
                        <div key={state.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                          <div 
                            className="w-4 h-4 rounded shadow-sm border border-gray-200"
                            style={{
                              backgroundColor: `rgb(${state.colors.cloud[0]}, ${state.colors.cloud[1]}, ${state.colors.cloud[2]})`,
                              opacity: state.colors.cloud[3]
                            }}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {state.emoji} {state.name}
                            </div>
                            <div className="text-xs text-gray-600">
                              {state.precipitation[0]}-{state.precipitation[1]}mm/h
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feature Descriptions */}
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-900 mb-2">🎨 시각화 특징</div>
                      <div className="space-y-1 text-xs text-gray-700">
                        <div>• 실시간 날씨 효과 시뮬레이션</div>
                        <div>• 줌 레벨별 차별화된 시각화</div>
                        <div>• 3D 건물 및 지형 모델링</div>
                        <div>• 인터랙티브 지역 탐색</div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-900 mb-2">🎮 조작 방법</div>
                      <div className="space-y-1 text-xs text-gray-700">
                        <div>• 마우스 드래그: 화면 이동</div>
                        <div>• 스크롤: 줌 인/아웃</div>
                        <div>• Shift + 드래그: 회전</div>
                        <div>• 더블클릭: 줌 인</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Status Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 px-3 py-2 sm:px-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-gray-700 text-xs sm:text-sm">
                  {selectedLayer === 'all' ? '전체' : 
                   selectedLayer === 'weather' ? '날씨' : 
                   selectedLayer === 'buildings' ? '건물' : '구역'}
                </span>
              </div>
              <div className="text-gray-600 text-xs sm:text-sm">
                줌: {viewState.zoom.toFixed(1)} | {viewState.pitch}°
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-gray-600">
              <span>🎮</span>
              <span className="text-xs">마우스로 이동 • 스크롤로 줌</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weather Summary Card - Hidden on mobile when panel is open */}
      {!isCollapsed && (
        <div className="absolute top-20 right-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 sm:p-4 w-48 sm:w-64 hidden md:block">
          <div className="text-sm font-medium text-gray-900 mb-2">실시간 날씨 현황</div>
          <div className="space-y-2">
            {weatherStations.slice(0, 3).map((station) => (
              <div key={station.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    station.weather.precipitation > 10 ? 'bg-blue-500' :
                    station.weather.precipitation > 1 ? 'bg-blue-300' :
                    station.weather.cloudCoverage > 50 ? 'bg-gray-400' : 'bg-yellow-400'
                  }`}></div>
                  <span className="text-xs text-gray-700">{station.name}</span>
                </div>
                <div className="text-xs text-gray-600">
                  {station.weather.precipitation > 0 ? `${station.weather.precipitation.toFixed(1)}mm` : '맑음'}
                </div>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="text-xs text-gray-600">
                평균 강수량: {(weatherStations.reduce((sum, s) => sum + s.weather.precipitation, 0) / weatherStations.length).toFixed(1)}mm/h
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button */}
      <div className="absolute bottom-20 right-4 z-10 md:hidden">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
        >
          {isCollapsed ? '📍' : '✕'}
        </button>
      </div>

      {/* Region Navigation Overlay */}
      {isTransitioning && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 px-4 py-3 max-w-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">📍</span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {transitionTarget}로 이동
                </div>
                <div className="text-xs text-gray-600">
                  지역 날씨 정보를 확인해보세요
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
          scrollZoom: { speed: 0.03, smooth: true }, // Faster, responsive zoom
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
          className="absolute pointer-events-none z-20"
          style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}