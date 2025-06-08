import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import { WeatherStation, CloudParticle, RainParticle } from '@/types/weather';
import { SeoulGeoJSON, SeoulDistrictFeature } from '@/data/seoul-geojson-loader';

// Generate district rain area layer
export const createDistrictRainLayer = (
  weatherStations: WeatherStation[], 
  seoulGeoJSON: SeoulGeoJSON | null
) => {
  const rainingDistricts = weatherStations.filter(station => station.weather.precipitation > 0);
  
  if (rainingDistricts.length === 0 || !seoulGeoJSON) {
    return null;
  }

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

  return new GeoJsonLayer({
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