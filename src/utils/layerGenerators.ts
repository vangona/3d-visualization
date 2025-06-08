import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import { WeatherStation, CloudParticle, RainParticle } from '@/types/weather';
import { SeoulGeoJSON, SeoulDistrictFeature } from '@/data/seoul-geojson-loader';

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
export const createCloudBaseLayer = (cloudParticles: CloudParticle[]) => {
  return new ScatterplotLayer({
    id: 'clouds-base',
    data: cloudParticles,
    getPosition: (d: CloudParticle) => d.position,
    getFillColor: (d: CloudParticle) => {
      // 색상값이 제대로 전달되도록 확인
      const alpha = Math.floor(d.opacity * 255); // 0-1 범위를 0-255로 변환
      return [d.color[0], d.color[1], d.color[2], alpha];
    },
    getRadius: (d: CloudParticle) => d.size * 1.3, // 더 큰 크기로 겹침 증가
    radiusUnits: 'meters',
    opacity: 1, // 전체 레이어 투명도를 1로 설정 (개별 알파값만 사용)
    radiusMinPixels: 25,
    radiusMaxPixels: 400,
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
export const createCloudHighlightLayer = (cloudParticles: CloudParticle[]) => {
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
    getRadius: (d: CloudParticle) => d.size * 0.7, // 더 작은 하이라이트
    radiusUnits: 'meters',
    opacity: 1, // 전체 레이어 투명도를 1로 설정
    radiusMinPixels: 15,
    radiusMaxPixels: 200,
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

// Generate rain layer
export const createRainLayer = (rainParticles: RainParticle[]) => {
  return new ScatterplotLayer({
    id: 'rain-main',
    data: rainParticles,
    getPosition: (d: RainParticle) => d.position,
    getFillColor: [100, 150, 255, 200], // 선명한 파란색 빗방울
    getRadius: (d: RainParticle) => d.size, // 원래 크기
    radiusUnits: 'meters',
    opacity: 1.0,
    radiusMinPixels: 1,
    radiusMaxPixels: 8,
    stroked: false,
    filled: true,
    antialiasing: true,
    // 블렌딩 제거 - 선명한 빗방울
    parameters: {
      blend: true,
      blendFunc: [0x0302, 0x0303], // GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA
      blendEquation: 0x8006, // GL.FUNC_ADD
      depthTest: true,
      depthMask: true
    }
  });
};