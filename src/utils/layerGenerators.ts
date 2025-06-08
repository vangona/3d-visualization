import { GeoJsonLayer, ScatterplotLayer, ColumnLayer, LineLayer } from '@deck.gl/layers';
import { WeatherStation, CloudParticle, RainParticle } from '@/types/weather';
import { SeoulGeoJSON, SeoulDistrictFeature } from '@/data/seoul-geojson-loader';

// Define rain line data type for better type safety
interface RainLineData {
  sourcePosition: [number, number, number];
  targetPosition: [number, number, number];
  intensity: number;
  speed: number;
  id: string;
}

// Generate district layer (all districts with weather-based coloring)
export const createDistrictRainLayer = (
  weatherStations: WeatherStation[], 
  seoulGeoJSON: SeoulGeoJSON | null
) => {
  console.log('Creating district layer:', {
    totalStations: weatherStations.length,
    hasGeoJSON: !!seoulGeoJSON
  });
  
  if (!seoulGeoJSON) {
    console.log('District layer not created - no GeoJSON');
    return null;
  }

  // 모든 구역을 표시하되, weather station 정보를 매칭
  const enhancedGeoJSON = {
    type: "FeatureCollection" as const,
    features: seoulGeoJSON.features.map((feature: SeoulDistrictFeature) => {
      // 해당 구의 weather station 찾기
      const station = weatherStations.find(s => s.name === feature.properties.sggnm);
      return {
        ...feature,
        type: "Feature" as const,
        properties: {
          ...feature.properties,
          precipitation: station?.weather.precipitation || 0,
          cloudCoverage: station?.weather.cloudCoverage || 0,
          hasWeatherData: !!station
        }
      };
    })
  };
  
  console.log('Enhanced GeoJSON features:', enhancedGeoJSON.features.length);
  console.log('Features with weather data:', enhancedGeoJSON.features.filter(f => f.properties.hasWeatherData).length);

  return new GeoJsonLayer({
    id: 'district-areas',
    data: enhancedGeoJSON,
    getFillColor: (f: { properties: { precipitation: number; hasWeatherData: boolean } }) => {
      if (!f.properties.hasWeatherData) {
        // Weather 데이터가 없는 구역은 연한 회색
        return [200, 200, 200, 30];
      }
      
      if (f.properties.precipitation > 0) {
        // 비가 오는 구역은 파란색 (강수량에 따라 진하기 조절)
        const intensity = Math.min(f.properties.precipitation / 30, 1);
        return [50, 100, 200, Math.max(50, intensity * 120)];
      } else {
        // 맑은 구역은 연한 노란색
        return [255, 255, 150, 40];
      }
    },
    getLineColor: [100, 100, 100, 180], // 회색 테두리
    getLineWidth: 50,
    lineWidthMinPixels: 1,
    lineWidthMaxPixels: 3,
    pickable: true,
    stroked: true,
    filled: true,
    extruded: false,
    opacity: 1.0,
    wireframe: false,
    getElevation: 0
  });
};

// Generate cloud base layer
export const createCloudBaseLayer = (cloudParticles: CloudParticle[], zoom: number = 11) => {
  return new ScatterplotLayer({
    id: 'clouds-base',
    data: cloudParticles,
    getPosition: (d: CloudParticle) => d.position,
    getFillColor: (d: CloudParticle) => {
      // 색상값이 제대로 전달되도록 확인
      const alpha = Math.floor(d.opacity * 255); // 0-1 범위를 0-255로 변환
      return [d.color[0], d.color[1], d.color[2], alpha];
    },
    getRadius: (d: CloudParticle) => {
      // 줌 레벨에 따른 크기 조정
      const zoomMultiplier = zoom >= 13 ? 1 + (zoom - 13) * 0.3 : // 13+ 줌에서 30%씩 증가
                            zoom >= 11 ? 0.8 + (zoom - 11) * 0.1 : 0.8; // 11-13에서 점진 증가
      return d.size * 1.3 * zoomMultiplier;
    },
    radiusUnits: 'meters',
    opacity: 1, // 전체 레이어 투명도를 1로 설정 (개별 알파값만 사용)
    radiusMinPixels: 25,
    radiusMaxPixels: Math.min(600, 400 + (zoom - 11) * 50), // 줌에 따라 최대 크기 증가
    stroked: false,
    filled: true,
    antialiasing: true,
    billboard: true,
    // 블렌딩 파라미터 제거 - ScatterplotLayer의 기본값 사용
    parameters: {
      depthTest: false
    }
  });
};

// Generate cloud highlight layer
export const createCloudHighlightLayer = (cloudParticles: CloudParticle[], zoom: number = 11) => {
  return new ScatterplotLayer({
    id: 'clouds-highlight',
    data: cloudParticles.filter((_, index) => index % 3 === 0), // 1/3만 렌더링
    getPosition: (d: CloudParticle) => d.position,
    getFillColor: (d: CloudParticle) => {
      // 하이라이트 효과를 위해 약간 밝게, 더 투명하게
      const alpha = Math.floor(d.opacity * 150); // 더 투명한 하이라이트
      return [
        Math.min(255, d.color[0] * 1.1), // 살짝만 밝게
        Math.min(255, d.color[1] * 1.1),
        Math.min(255, d.color[2] * 1.1),
        alpha
      ];
    },
    getRadius: (d: CloudParticle) => {
      // 줌 레벨에 따른 크기 조정 (하이라이트용)
      const zoomMultiplier = zoom >= 13 ? 1 + (zoom - 13) * 0.3 : 
                            zoom >= 11 ? 0.8 + (zoom - 11) * 0.1 : 0.8;
      return d.size * 0.7 * zoomMultiplier;
    },
    radiusUnits: 'meters',
    opacity: 1, // 전체 레이어 투명도를 1로 설정
    radiusMinPixels: 15,
    radiusMaxPixels: Math.min(300, 200 + (zoom - 11) * 25), // 하이라이트 최대 크기 증가
    stroked: false,
    filled: true,
    antialiasing: true,
    billboard: true,
    // 블렌딩 파라미터 제거 - ScatterplotLayer의 기본값 사용
    parameters: {
      depthTest: false
    }
  });
};

// Generate realistic rain layer using LineLayer with proper error handling
export const createRainLayer = (
  rainParticles: RainParticle[], 
  viewState?: { longitude: number; latitude: number; zoom: number }
) => {
  
  // Filter particles based on zoom level
  let filteredParticles = rainParticles;
  
  if (viewState && viewState.zoom < 11) {
    console.log('Filtering rain particles for low zoom:', viewState.zoom);
    
    filteredParticles = rainParticles.filter((_, index) => {
      const hash = (index * 2654435761) % 10;
      return hash < 3; // Keep 30% at low zoom
    });
    
    console.log('Filtered rain particles:', filteredParticles.length, 'from', rainParticles.length);
  } else {
    console.log('Showing all rain particles:', rainParticles.length, 'at zoom:', viewState?.zoom);
  }

  // Safety check for empty data
  if (!filteredParticles || filteredParticles.length === 0) {
    console.log('No rain particles to display');
    return null;
  }

  try {
    // Convert particles to line segments for vertical rain streaks
    const rainLines: RainLineData[] = filteredParticles.map((particle, index) => {
      const [lon, lat, altitude] = particle.position;
      
      // Vertical rain streak - longer for heavier rain
      const streakLength = Math.abs(particle.velocity[2]) * 6; // Moderate length
      const bottomAltitude = Math.max(0, altitude - streakLength);
      
      return {
        sourcePosition: [lon, lat, altitude],
        targetPosition: [lon, lat, bottomAltitude], // Perfectly vertical
        intensity: particle.size / 15,
        speed: Math.abs(particle.velocity[2]),
        id: `rain-${index}` // Add unique ID for stability
      };
    });

    // Zoom-responsive line width
    const currentZoom = viewState?.zoom || 11;
    const baseWidth = currentZoom >= 14 ? 1.2 : currentZoom >= 12 ? 0.8 : 0.6;
    
    return new LineLayer<RainLineData>({
      id: 'rain-lines-stable',
      data: rainLines,
      
      // Position accessors
      getSourcePosition: (d: RainLineData) => d.sourcePosition,
      getTargetPosition: (d: RainLineData) => d.targetPosition,
      
      // Rain appearance
      getColor: (d: RainLineData) => {
        const intensity = Math.min(d.intensity * 1.2, 1);
        const alpha = Math.floor(100 + intensity * 100); // 100-200 alpha
        
        // Natural rain color
        return [110, 140, 180, alpha];
      },
      
      // Line properties
      getWidth: (d: RainLineData) => baseWidth * (0.8 + d.intensity * 0.4),
      widthUnits: 'pixels',
      widthMinPixels: 0.5,
      widthMaxPixels: 2.5,
      
      // Stability settings
      pickable: false,
      autoHighlight: false,
      
      // Update triggers to prevent state transfer errors
      updateTriggers: {
        getSourcePosition: [filteredParticles.length],
        getTargetPosition: [filteredParticles.length],
        getColor: [currentZoom],
        getWidth: [currentZoom]
      }
    });
    
  } catch (error) {
    console.error('Error creating rain LineLayer, falling back to ScatterplotLayer:', error);
    
    // Fallback to ScatterplotLayer if LineLayer fails
    return new ScatterplotLayer({
      id: 'rain-fallback',
      data: filteredParticles,
      getPosition: (d: RainParticle) => d.position,
      getRadius: (d: RainParticle) => d.size * 1.5,
      getFillColor: [110, 140, 180, 160],
      radiusMinPixels: 1,
      radiusMaxPixels: 3,
      pickable: false
    });
  }
};

// Generate 3D column layer for overview visualization
export const createWeatherColumnLayer = (
  weatherStations: WeatherStation[],
  seoulGeoJSON: SeoulGeoJSON | null,
  zoom: number
) => {
  if (!seoulGeoJSON || zoom > 11) { // Changed to > 11 so columns show at zoom 11
    return null;
  }
  
  console.log('Creating weather columns at zoom:', zoom);

  // Calculate district centers from GeoJSON
  const districtCenters = weatherStations.map(station => {
    // Find corresponding district feature
    const districtFeature = seoulGeoJSON.features.find(
      (f: SeoulDistrictFeature) => f.properties.sggnm === station.name
    );

    if (!districtFeature) {
      return {
        station,
        center: [station.location.longitude, station.location.latitude],
        area: 1000000 // Default area
      };
    }

    // Calculate area for radius calculation
    const coordinates = districtFeature.geometry.coordinates;
    let totalArea = 0;
    
    // Simple area calculation for polygon
    if (coordinates && coordinates[0]) {
      const polygon = coordinates[0];
      if (Array.isArray(polygon) && polygon.length > 0) {
        totalArea = polygon.length * 1000; // Approximate area
      }
    }

    // Calculate centroid
    const center = [station.location.longitude, station.location.latitude];

    return {
      station,
      center,
      area: Math.max(500000, totalArea)
    };
  });

  console.log('District centers created:', districtCenters.length);
  console.log('Sample district data:', districtCenters[0]);

  return new ColumnLayer({
    id: 'weather-columns',
    data: districtCenters,
    getPosition: (d: { center: [number, number] }) => d.center,
    getElevation: (d: { station: WeatherStation }) => {
      // Height based on precipitation (100-2000m)
      const precipitation = d.station.weather.precipitation;
      const height = Math.max(100, precipitation * 80 + 200);
      console.log(`Station ${d.station.name}: precipitation=${precipitation}, height=${height}`);
      return height;
    },
    getFillColor: (d: { station: WeatherStation }): [number, number, number, number] => {
      const precipitation = d.station.weather.precipitation;
      const cloudCoverage = d.station.weather.cloudCoverage;
      
      // 현재 UI 색상 체계에 맞춘 색상 (지면 레이어와 유사한 색역)
      if (precipitation > 20) {
        // 폭우 - 진한 파랑 (강수 강도에 따라)
        const intensity = Math.min(precipitation / 30, 1);
        const alpha = Math.max(180, 200 + intensity * 55);
        return [30, 80, 180, alpha];
      } else if (precipitation > 10) {
        // 비 - 중간 파랑
        const intensity = Math.min(precipitation / 20, 1);
        const alpha = Math.max(160, 180 + intensity * 75);
        return [50, 100, 200, alpha];
      } else if (precipitation > 1) {
        // 약한 비 - 연한 파랑
        const intensity = Math.min(precipitation / 10, 1);
        const alpha = Math.max(140, 160 + intensity * 95);
        return [80, 130, 220, alpha];
      } else if (cloudCoverage > 50) {
        // 흐림 - 연한 회색 (UI의 회색과 유사)
        return [180, 180, 185, 160];
      } else {
        // 맑음 - 연한 노란색 (UI의 노란색과 유사)
        return [255, 255, 150, 180];
      }
    },
    getLineColor: [120, 120, 130, 220], // 더 부드러운 테두리
    getRadius: (d: { station: WeatherStation; area: number }) => {
      // Radius based on district area and weather intensity
      const baseRadius = Math.sqrt(d.area) * 0.8;
      const weatherMultiplier = 1 + (d.station.weather.precipitation * 0.05);
      return Math.max(200, Math.min(800, baseRadius * weatherMultiplier));
    },
    elevationScale: 1,
    radius: 300,
    opacity: 0.9,
    stroked: true,
    filled: true,
    extruded: true,
    wireframe: false,
    lineWidthMinPixels: 1,
    lineWidthMaxPixels: 2,
    // 조명 설정 추가 - 더 밝게
    material: {
      ambient: 0.9,  // 주변광을 더 높게
      diffuse: 0.8,  // 확산광도 증가
      shininess: 16,
      specularColor: [255, 255, 255]
    },
    // 추가 렌더링 설정
    parameters: {
      depthTest: true,
      depthMask: true
    }
  });
};