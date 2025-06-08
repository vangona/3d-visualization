import * as turf from '@turf/turf';
import { WeatherStation, CloudParticle, RainParticle, WeatherColorConfig } from '@/types/weather';
import { getWeatherState } from '@/utils/weather';
import { SeoulGeoJSON, SeoulDistrictFeature } from '@/data/seoul-geojson-loader';

// Generate cloud particles based on weather data within district boundaries
export const generateCloudParticles = (stations: WeatherStation[], geoJSON: SeoulGeoJSON | null): CloudParticle[] => {
  const particles: CloudParticle[] = [];
  
  if (!geoJSON) {
    return particles;
  }
  
  
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
      } catch {
        // Silently skip on error
      }
    }
  });
  
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
  // 클러스터 중심 주변에 파티클 분산 (더 밀집된 구름)
  const spreadRadius = 0.002 + Math.random() * 0.006; // 더 작은 범위로 밀집
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.pow(Math.random(), 0.8) * spreadRadius; // 더 중심에 집중
  
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
  const fadeEffect = Math.pow(1 - distanceFromClusterCenter, 1.2); // 더 부드러운 페이드
  const clusterOpacity = baseOpacity * fadeEffect * (0.7 + Math.random() * 0.4); // 더 진한 투명도
  
  // 날씨 상태에 따른 구름 색상 적용
  const [r, g, b] = weatherState.colors.cloud.slice(0, 3);
  // 색상 변화 비활성화 (원래 색상 유지)
  const finalR = r;
  const finalG = g;
  const finalB = b;
  
  // 구름 크기를 더 크고 일관성 있게 조정
  const sizeRandomness = Math.random();
  const baseSizeVariation = sizeRandomness < 0.2 ? 150 + Math.random() * 50 : // 20% 중간
                           sizeRandomness < 0.6 ? 200 + Math.random() * 100 : // 40% 큰
                           300 + Math.random() * 150; // 40% 매우 큰
  
  const sizeMultiplier = weatherState.id === 'heavy_rain' ? 1.2 : 
                        weatherState.id === 'rainy' ? 1.1 :
                        weatherState.id === 'cloudy' ? 1.0 : 
                        weatherState.id === 'partly_cloudy' ? 0.8 : 0.7;
  
  return {
    position: [point[0], point[1], altitude],
    size: baseSizeVariation * sizeMultiplier,
    density: cloudDensity,
    color: [finalR, finalG, finalB],
    opacity: Math.max(0.3, Math.min(0.8, clusterOpacity)), // 더 진한 구름으로 조정
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
    return particles;
  }
  
  stations.forEach((station) => {
    // Get weather state and color configuration
    const weatherState = getWeatherState(station.weather.precipitation, station.weather.cloudCoverage);
    
    if (station.weather.precipitation > 0) {
      // 강수량에 비례한 빗방울 수 (날씨 상태에 따라 조정)
      // 줌 레벨이 높을수록 더 많은 파티클로 밀도감 증가
      const zoomMultiplier = viewState && viewState.zoom > 13 ? 1 + (viewState.zoom - 13) * 0.3 : 1;
      const baseCount = station.weather.precipitation * 40 * zoomMultiplier; 
      const stateMultiplier = weatherState.id === 'heavy_rain' ? 3.0 :
                             weatherState.id === 'rainy' ? 2.2 :
                             weatherState.id === 'cloudy' ? 1.5 : 1.0;
      const particleCount = Math.floor(baseCount * stateMultiplier);
      
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
        } catch {
          // Silently skip on error
        }
      }
    }
  });
  
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
  
  // 날씨 상태에 따른 비 속도 조정 (더 빠르게)
  const velocity = weatherState.id === 'heavy_rain' ? -35 - Math.random() * 20 :
                  weatherState.id === 'rainy' ? -25 - Math.random() * 15 :
                  -20 - Math.random() * 10;
  const rainSize = weatherState.id === 'heavy_rain' ? 1.5 + Math.random() * 1 :    // 1.5-2.5m
                  weatherState.id === 'rainy' ? 1 + Math.random() * 0.5 :        // 1-1.5m
                  0.5 + Math.random() * 0.5;                                    // 0.5-1m
  
  return {
    id: `rain-${particleId}`,
    position: [point[0], point[1], startHeight],
    velocity: [0, 0, velocity],
    size: rainSize,
    lifetime: Math.random() * 3,
  };
};