import * as turf from '@turf/turf';
import { WeatherStation, CloudParticle, RainParticle, WeatherColorConfig } from '@/types/weather';
import { getWeatherState } from '@/utils/weather';
import { SeoulGeoJSON, SeoulDistrictFeature } from '@/data/seoul-geojson-loader';

// Generate cloud particles based on weather data within district boundaries
export const generateCloudParticles = (stations: WeatherStation[], geoJSON: SeoulGeoJSON | null): CloudParticle[] => {
  const particles: CloudParticle[] = [];
  
  if (!geoJSON) {
    console.log('No GeoJSON data for cloud particles');
    return particles;
  }
  
  console.log('Generating cloud particles for', stations.length, 'stations');
  
  
  stations.forEach((station) => {
    // Get weather state and color configuration
    const weatherState = getWeatherState(station.weather.precipitation, station.weather.cloudCoverage);
    
    if (station.weather.cloudCoverage > 5) { // 구름이 있는 경우만 (더 민감하게)
      const cloudDensity = station.weather.cloudCoverage / 100;
      
      // 구름 클러스터 수: 밀도에 따라 조정 (더 극적인 차이)
      const clusterCount = Math.floor(cloudDensity * 10) + 1;
      
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
          
          // 적절한 수의 파티클로 조정 (더 극적인 차이)
          const particlesPerCluster = Math.floor(cloudDensity * 20) + 5;
          
          for (let i = 0; i < particlesPerCluster; i++) {
            const cloudParticle = generateSingleCloudParticle(
              clusterCenter, 
              station, 
              weatherState, 
              cluster, 
              cloudDensity
            );
            particles.push(cloudParticle);
          }
        }
      } catch (error) {
        console.warn('Error generating cloud particles for', station.name, error);
      }
    }
  });
  
  console.log('Generated', particles.length, 'cloud particles');
  return particles;
};

// Generate a single cloud particle
const generateSingleCloudParticle = (
  clusterCenter: [number, number],
  station: WeatherStation,
  weatherState: WeatherColorConfig,
  cluster: number,
  cloudDensity: number
): CloudParticle => {
  // 클러스터 중심 주변에 파티클 분산
  const spreadRadius = 0.004 + Math.random() * 0.008;
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.pow(Math.random(), 0.6) * spreadRadius;
  
  const point: [number, number] = [
    clusterCenter[0] + Math.cos(angle) * distance,
    clusterCenter[1] + Math.sin(angle) * distance
  ];
  
  // 구름 고도: 강수량이 많을수록 낮은 구름 + 클러스터별 변화
  // 비보다 확실히 높게 설정 (비: 300-1500m, 구름: 1600-2800m)
  const baseAltitude = 1600 - (station.weather.precipitation * 30) + (cluster * 150);
  const altitude = baseAltitude + Math.random() * 1200;
  
  // 클러스터 중심에서의 거리에 따른 투명도 계산 (더 부드러운 그라데이션)
  const distanceFromClusterCenter = distance / spreadRadius;
  const baseOpacity = weatherState.colors.cloud[3];
  const fadeEffect = Math.pow(1 - distanceFromClusterCenter, 1.5); // 더 자연스러운 페이드
  const clusterOpacity = baseOpacity * fadeEffect * (0.5 + Math.random() * 0.3); // 투명도 변화 (더 투명하게)
  
  // 날씨 상태에 따른 구름 색상 적용
  const [r, g, b] = weatherState.colors.cloud;
  // 색상 변화를 줄여서 원래 색상이 더 잘 보이도록 함
  const colorVariation = 0.9 + Math.random() * 0.2; // 0.9-1.1 색상 변화 (더 작은 변화)
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
  
  return {
    position: [point[0], point[1], altitude],
    size: baseSizeVariation * sizeMultiplier,
    density: cloudDensity,
    color: [finalR, finalG, finalB],
    opacity: Math.max(0.1, Math.min(0.6, clusterOpacity)), // 더 투명하게 조정
  };
};

// Generate rain particles based on precipitation within district boundaries
export const generateRainParticles = (
  stations: WeatherStation[], 
  geoJSON: SeoulGeoJSON, 
  viewState?: { longitude: number; latitude: number; zoom: number }
): RainParticle[] => {
  const particles: RainParticle[] = [];
  let particleId = 0;
  
  if (!geoJSON) {
    console.log('No GeoJSON data for rain particles');
    return particles;
  }
  
  console.log('Generating rain particles for', stations.length, 'stations');
  
  stations.forEach((station) => {
    // Get weather state and color configuration
    const weatherState = getWeatherState(station.weather.precipitation, station.weather.cloudCoverage);
    
    if (station.weather.precipitation > 0) {
      // Calculate distance from viewport center for optimization
      let distanceMultiplier = 1.0;
      let zoomMultiplier = 1.0;
      
      if (viewState) {
        // Distance-based optimization
        const distanceFromCenter = Math.sqrt(
          Math.pow(station.location.longitude - viewState.longitude, 2) +
          Math.pow(station.location.latitude - viewState.latitude, 2)
        );
        
        // Reduce particles for distant areas (beyond ~0.05 degrees)
        if (distanceFromCenter > 0.05) {
          distanceMultiplier = Math.max(0.3, 1 - (distanceFromCenter - 0.05) * 5);
        }
        
        // Zoom-based density increase
        if (viewState.zoom >= 13) {
          zoomMultiplier = 1 + (viewState.zoom - 13) * 0.5; // 50% more per zoom level
        } else if (viewState.zoom >= 11) {
          zoomMultiplier = 0.5 + (viewState.zoom - 11) * 0.25; // Gradual increase
        } else {
          zoomMultiplier = 0.2; // Very few particles at overview
        }
      }
      
      // 강수량에 비례한 빗방울 수 (날씨 상태에 따라 조정, 거리/줌 최적화 제거)
      const baseCount = station.weather.precipitation * 35; // 더 많은 기본 파티클
      const stateMultiplier = weatherState.id === 'heavy_rain' ? 2.5 :
                             weatherState.id === 'rainy' ? 1.8 :
                             weatherState.id === 'cloudy' ? 1.3 : 1.0;
      const particleCount = Math.floor(baseCount * stateMultiplier); // 거리/줌 조정 제거
      
      // 해당 구의 모든 동 features 찾기
      const districtFeatures = geoJSON.features.filter((f: SeoulDistrictFeature) => f.properties.sggnm === station.name);
      if (districtFeatures.length === 0) return;
      
      // 구 전체의 bbox 계산
      const districtCollection = turf.featureCollection(districtFeatures);
      const bbox = turf.bbox(districtCollection) as [number, number, number, number];
      
      for (let i = 0; i < particleCount; i++) {
        try {
          const rainParticle = generateSingleRainParticle(
            districtFeatures,
            bbox,
            weatherState,
            particleId++
          );
          if (rainParticle) {
            particles.push(rainParticle);
          }
        } catch (error: unknown) {
          console.error('Error generating rain particles:', error);
        }
      }
    }
  });
  
  console.log('Generated', particles.length, 'rain particles', viewState ? `(zoom: ${viewState.zoom.toFixed(1)})` : '');
  return particles;
};

// Generate a single rain particle
const generateSingleRainParticle = (
  districtFeatures: SeoulDistrictFeature[],
  bbox: [number, number, number, number],
  weatherState: WeatherColorConfig,
  particleId: number
): RainParticle | null => {
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
  
  // 빗줄기를 구름 아래에서 시작하도록 조정
  // 구름의 최소 고도보다 낮게 설정 (구름: 1800-2600m, 비: 300-1500m)
  const startHeight = 300 + Math.random() * 1200;
  
  // 날씨 상태에 따른 비 속도와 크기 조정
  const velocity = weatherState.id === 'heavy_rain' ? -25 - Math.random() * 15 :
                  weatherState.id === 'rainy' ? -20 - Math.random() * 10 :
                  -15 - Math.random() * 8;
  const rainSize = weatherState.id === 'heavy_rain' ? 1.5 + Math.random() * 2 :
                  weatherState.id === 'rainy' ? 1.0 + Math.random() * 1.5 :
                  0.5 + Math.random() * 1;
  
  return {
    id: `rain-${particleId}`,
    position: [point[0], point[1], startHeight],
    velocity: [0, 0, velocity],
    size: rainSize,
    lifetime: Math.random() * 3,
  };
};