// 건물 효과 로직

import { WeatherStation } from '@/types/weather';
import { BUILDING_COLORS, getWeatherEffect } from '@/constants/buildingColors';

// 위치 기반으로 가장 가까운 날씨 관측소 찾기
export const findNearestWeatherStation = (
  longitude: number,
  latitude: number,
  weatherStations: WeatherStation[]
): WeatherStation | null => {
  if (weatherStations.length === 0) return null;

  let nearest = weatherStations[0];
  let minDistance = calculateDistance(longitude, latitude, nearest.location.longitude, nearest.location.latitude);

  for (const station of weatherStations) {
    const distance = calculateDistance(longitude, latitude, station.location.longitude, station.location.latitude);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  }

  return nearest;
};

// 두 지점 간 거리 계산 (간단한 유클리드 거리)
const calculateDistance = (lon1: number, lat1: number, lon2: number, lat2: number): number => {
  return Math.sqrt(Math.pow(lon1 - lon2, 2) + Math.pow(lat1 - lat2, 2));
};

// 건물의 중심점 계산
export const getBuildingCenter = (coordinates: number[][][]): [number, number] => {
  if (!coordinates || coordinates.length === 0) return [0, 0];
  
  const polygon = coordinates[0]; // 첫 번째 링 (외부 경계)
  if (!polygon || polygon.length === 0) return [0, 0];

  let sumLon = 0;
  let sumLat = 0;
  
  for (const point of polygon) {
    sumLon += point[0];
    sumLat += point[1];
  }
  
  return [sumLon / polygon.length, sumLat / polygon.length];
};

// 건물 색상 결정
export const getBuildingColor = (
  coordinates: number[][][],
  weatherStations: WeatherStation[]
): [number, number, number, number] => {
  const [lon, lat] = getBuildingCenter(coordinates);
  const nearestStation = findNearestWeatherStation(lon, lat, weatherStations);
  
  if (!nearestStation) {
    return BUILDING_COLORS.clear;
  }
  
  const effect = getWeatherEffect(nearestStation.weather.precipitation);
  return BUILDING_COLORS[effect as keyof typeof BUILDING_COLORS];
};

// 건물 높이 결정 (날씨 효과 적용)
export const getBuildingHeight = (
  baseHeight: number | undefined,
  coordinates: number[][][],
  weatherStations: WeatherStation[]
): number => {
  // Mapbox 건물 데이터의 높이 처리
  // height가 없으면 건물 면적 기반으로 추정
  let estimatedHeight = baseHeight;
  
  if (!estimatedHeight) {
    // 건물 면적 기반 높이 추정
    const area = calculatePolygonArea(coordinates);
    if (area > 10000) { // 큰 건물
      estimatedHeight = 60 + Math.random() * 100; // 60-160m
    } else if (area > 5000) { // 중간 건물
      estimatedHeight = 30 + Math.random() * 50;  // 30-80m
    } else if (area > 1000) { // 작은 건물
      estimatedHeight = 15 + Math.random() * 25;  // 15-40m
    } else { // 매우 작은 건물
      estimatedHeight = 8 + Math.random() * 12;   // 8-20m
    }
  }
  
  const [lon, lat] = getBuildingCenter(coordinates);
  const nearestStation = findNearestWeatherStation(lon, lat, weatherStations);
  
  if (!nearestStation) {
    return estimatedHeight;
  }
  
  // 날씨 효과 적용
  const effect = getWeatherEffect(nearestStation.weather.precipitation);
  let heightMultiplier = 1.0;
  
  switch (effect) {
    case 'heavyRain':
      heightMultiplier = 1.05; // 5% 증가 (물 고임 효과)
      break;
    case 'rain':
      heightMultiplier = 1.02; // 2% 증가
      break;
    default:
      heightMultiplier = 1.0;
  }
  
  return Math.max(3, estimatedHeight * heightMultiplier); // 최소 3m
};

// 폴리곤 면적 계산 (간단한 공식)
const calculatePolygonArea = (coordinates: number[][][]): number => {
  if (!coordinates || coordinates.length === 0) return 0;
  
  const polygon = coordinates[0]; // 첫 번째 링 (외부 경계)
  if (!polygon || polygon.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < polygon.length - 1; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[i + 1];
    area += (x1 * y2 - x2 * y1);
  }
  
  return Math.abs(area) / 2 * 111000 * 111000; // 대략적인 제곱미터 변환
};