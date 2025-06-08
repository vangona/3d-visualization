// 도로 효과 로직

import { WeatherStation } from '@/types/weather';
import { ROAD_COLORS, WATER_COLORS, getWeatherEffect } from '@/constants/buildingColors';
import { findNearestWeatherStation } from './buildingEffects';

// 도로의 중심점 계산
export const getRoadCenter = (coordinates: number[][]): [number, number] => {
  if (!coordinates || coordinates.length === 0) return [0, 0];
  
  let sumLon = 0;
  let sumLat = 0;
  
  for (const point of coordinates) {
    sumLon += point[0];
    sumLat += point[1];
  }
  
  return [sumLon / coordinates.length, sumLat / coordinates.length];
};

// 도로 색상 결정
export const getRoadColor = (
  coordinates: number[][],
  weatherStations: WeatherStation[]
): [number, number, number, number] => {
  const [lon, lat] = getRoadCenter(coordinates);
  const nearestStation = findNearestWeatherStation(lon, lat, weatherStations);
  
  if (!nearestStation) {
    return ROAD_COLORS.clear;
  }
  
  const effect = getWeatherEffect(nearestStation.weather.precipitation);
  return ROAD_COLORS[effect as keyof typeof ROAD_COLORS];
};

// 도로 폭 결정 (날씨 효과 적용)
export const getRoadWidth = (
  roadClass: string | undefined,
  coordinates: number[][],
  weatherStations: WeatherStation[]
): number => {
  // 도로 등급별 기본 폭
  const baseWidth = getBaseRoadWidth(roadClass);
  
  const [lon, lat] = getRoadCenter(coordinates);
  const nearestStation = findNearestWeatherStation(lon, lat, weatherStations);
  
  if (!nearestStation) {
    return baseWidth;
  }
  
  // 비가 올 때 도로가 약간 더 넓게 보임 (물 고임 효과)
  const effect = getWeatherEffect(nearestStation.weather.precipitation);
  const widthMultiplier = effect === 'heavyRain' ? 1.2 : 
                         effect === 'rain' ? 1.1 : 1.0;
  
  return baseWidth * widthMultiplier;
};

// 도로 등급별 기본 폭 결정
const getBaseRoadWidth = (roadClass: string | undefined): number => {
  switch (roadClass) {
    case 'motorway':
    case 'trunk':
      return 12; // 고속도로/간선도로
    case 'primary':
      return 8;  // 1차 도로
    case 'secondary':
      return 6;  // 2차 도로
    case 'tertiary':
      return 4;  // 3차 도로
    case 'residential':
    case 'living_street':
      return 3;  // 주거지 도로
    case 'service':
    case 'track':
      return 2;  // 보조 도로
    default:
      return 4;  // 기본 폭
  }
};

// 수역 색상 결정
export const getWaterColor = (
  coordinates: number[][][] | number[][],
  weatherStations: WeatherStation[]
): [number, number, number, number] => {
  // 좌표계 정규화 (다양한 형태의 geometry 처리)
  let centerCoords: [number, number];
  
  if (Array.isArray(coordinates[0][0])) {
    // Polygon 형태
    const polygon = coordinates[0] as number[][];
    let sumLon = 0, sumLat = 0;
    for (const point of polygon) {
      sumLon += point[0];
      sumLat += point[1];
    }
    centerCoords = [sumLon / polygon.length, sumLat / polygon.length];
  } else {
    // LineString 형태
    const line = coordinates as number[][];
    let sumLon = 0, sumLat = 0;
    for (const point of line) {
      sumLon += point[0];
      sumLat += point[1];
    }
    centerCoords = [sumLon / line.length, sumLat / line.length];
  }
  
  const nearestStation = findNearestWeatherStation(centerCoords[0], centerCoords[1], weatherStations);
  
  if (!nearestStation) {
    return WATER_COLORS.clear;
  }
  
  const effect = getWeatherEffect(nearestStation.weather.precipitation);
  return WATER_COLORS[effect as keyof typeof WATER_COLORS];
};