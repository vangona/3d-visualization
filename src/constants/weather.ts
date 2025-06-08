import { WeatherColorConfig } from '@/types/weather';

export const WEATHER_STATES: WeatherColorConfig[] = [
  {
    id: 'clear',
    name: '맑음',
    emoji: '☀️',
    precipitation: [0, 0],
    cloudCoverage: [0, 20],
    colors: {
      cloud: [245, 250, 255, 0.4],     // 자연스러운 밝은 회색 구름 (아주 연한 파란빛)
      rain: [135, 206, 235, 0],        // 비 없음
      ambient: [255, 248, 220],        // 따뜻한 햇빛
      sky: { brightness: 1.0, contrast: 1.0 }
    }
  },
  {
    id: 'partly_cloudy',
    name: '구름조금',
    emoji: '⛅',
    precipitation: [0, 0.5],
    cloudCoverage: [20, 50],
    colors: {
      cloud: [220, 225, 235, 0.5],     // 자연스러운 연회색 구름
      rain: [176, 196, 222, 0.1],      // 매우 약한 비
      ambient: [245, 245, 220],        // 부드러운 노란빛
      sky: { brightness: 0.9, contrast: 0.95 }
    }
  },
  {
    id: 'cloudy',
    name: '흐림',
    emoji: '☁️',
    precipitation: [0.5, 2],
    cloudCoverage: [50, 75],
    colors: {
      cloud: [180, 185, 195, 0.6],     // 자연스러운 중간 회색 구름
      rain: [119, 136, 153, 0.3],      // 약한 회색 비
      ambient: [220, 220, 220],        // 차가운 회색빛
      sky: { brightness: 0.75, contrast: 0.85 }
    }
  },
  {
    id: 'rainy',
    name: '비',
    emoji: '🌧️',
    precipitation: [2, 10],
    cloudCoverage: [75, 90],
    colors: {
      cloud: [170, 180, 190, 0.7],     // 밝은 비구름 (파란빛 약간)
      rain: [70, 130, 180, 0.6],       // 파란빛 비
      ambient: [169, 169, 169],        // 어두운 회색빛
      sky: { brightness: 0.5, contrast: 0.7 }
    }
  },
  {
    id: 'heavy_rain',
    name: '폭우',
    emoji: '⛈️',
    precipitation: [10, 50],
    cloudCoverage: [90, 100],
    colors: {
      cloud: [140, 150, 160, 0.8],     // 자연스러운 진회색 폭우구름 (너무 짙지 않게)
      rain: [25, 25, 112, 0.8],        // 짙은 남색 비
      ambient: [105, 105, 105],        // 매우 어두운 회색
      sky: { brightness: 0.3, contrast: 0.6 }
    }
  }
];

// Seoul districts data
export const SEOUL_DISTRICTS = [
  { name: '강남구', lng: 127.0474, lat: 37.5172 },
  { name: '강동구', lng: 127.1238, lat: 37.5301 },
  { name: '강북구', lng: 127.0277, lat: 37.6397 },
  { name: '강서구', lng: 126.8497, lat: 37.5509 },
  { name: '관악구', lng: 126.9515, lat: 37.4781 },
  { name: '광진구', lng: 127.0853, lat: 37.5384 },
  { name: '구로구', lng: 126.8876, lat: 37.4954 },
  { name: '금천구', lng: 126.9018, lat: 37.4569 },
  { name: '노원구', lng: 127.0568, lat: 37.6542 },
  { name: '도봉구', lng: 127.0470, lat: 37.6658 },
  { name: '동대문구', lng: 127.0399, lat: 37.5744 },
  { name: '동작구', lng: 126.9393, lat: 37.5124 },
  { name: '마포구', lng: 126.9016, lat: 37.5664 },
  { name: '서대문구', lng: 126.9369, lat: 37.5791 },
  { name: '서초구', lng: 127.0327, lat: 37.4837 },
  { name: '성동구', lng: 127.0366, lat: 37.5635 },
  { name: '성북구', lng: 127.0167, lat: 37.5893 },
  { name: '송파구', lng: 127.1056, lat: 37.5145 },
  { name: '양천구', lng: 126.8665, lat: 37.5170 },
  { name: '영등포구', lng: 126.8962, lat: 37.5264 },
  { name: '용산구', lng: 126.9910, lat: 37.5326 },
  { name: '은평구', lng: 126.9292, lat: 37.6025 },
  { name: '종로구', lng: 126.9816, lat: 37.5735 },
  { name: '중구', lng: 126.9980, lat: 37.5636 },
  { name: '중랑구', lng: 127.0937, lat: 37.6063 },
];

// Weather scenarios for simulation
export const WEATHER_SCENARIOS = [
  { precipitation: 0, cloudCoverage: 10, desc: '맑음' },
  { precipitation: 0.5, cloudCoverage: 40, desc: '구름조금' },
  { precipitation: 3, cloudCoverage: 70, desc: '약한비' },
  { precipitation: 10, cloudCoverage: 90, desc: '보통비' },
  { precipitation: 25, cloudCoverage: 100, desc: '강한비' },
];