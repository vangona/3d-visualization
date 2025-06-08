// 건물 및 도로 색상 상수 정의

export const BUILDING_COLORS = {
  clear: [200, 200, 200, 180] as [number, number, number, number],      // 연한 회색 (기본)
  lightRain: [160, 160, 160, 200] as [number, number, number, number],  // 어두운 회색 (젖음)
  rain: [120, 120, 130, 220] as [number, number, number, number],       // 진한 회색 (반사)
  heavyRain: [80, 90, 120, 240] as [number, number, number, number]     // 매우 진한 색 (물 고임)
};

export const ROAD_COLORS = {
  clear: [150, 150, 150, 180] as [number, number, number, number],      // 일반 아스팔트
  lightRain: [100, 100, 100, 200] as [number, number, number, number],  // 젖은 아스팔트
  rain: [70, 70, 80, 220] as [number, number, number, number],          // 진한 젖은 도로
  heavyRain: [40, 50, 70, 240] as [number, number, number, number]     // 물 웅덩이
};

export const WATER_COLORS = {
  clear: [100, 150, 200, 120] as [number, number, number, number],      // 고요한 수면
  lightRain: [80, 130, 180, 140] as [number, number, number, number],   // 약간의 물결
  rain: [60, 110, 160, 160] as [number, number, number, number],        // 중간 물결
  heavyRain: [40, 90, 140, 180] as [number, number, number, number]     // 격렬한 물결
};

// 강수량에 따른 효과 분류 함수
export const getWeatherEffect = (precipitation: number) => {
  if (precipitation > 20) return 'heavyRain';
  if (precipitation > 5) return 'rain';
  if (precipitation > 0) return 'lightRain';
  return 'clear';
};