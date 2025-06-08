// Weather-related type definitions

export interface WeatherStation {
  id: string;
  name: string;
  location: {
    longitude: number;
    latitude: number;
  };
  weather: WeatherData;
}

export interface WeatherData {
  precipitation: number;      // 강수량 (mm/h)
  temperature: number;        // 온도 (°C)
  humidity: number;          // 습도 (%)
  windSpeed: number;         // 풍속 (m/s)
  windDirection: number;     // 풍향 (도)
  cloudCoverage: number;     // 구름양 (0-100%)
  visibility: number;        // 가시거리 (m)
  timestamp: string;         // ISO 8601 형식
}

export interface CloudParticle {
  position: [number, number, number];  // [lng, lat, altitude]
  size: number;                       // 구름 입자 크기
  density: number;                    // 밀도 (0-1)
  color: [number, number, number];    // RGB
  opacity: number;                    // 투명도 (0-1)
}

export interface RainParticle {
  id: string;
  position: [number, number, number];  // [lng, lat, altitude]
  velocity: [number, number, number];  // [vx, vy, vz]
  size: number;                       // 빗방울 크기
  lifetime: number;                   // 생존 시간 (초)
}

export interface DongInfo {
  dongName: string;
  guName: string;
  fullName: string;
  center: [number, number];  // [lng, lat]
  guWeatherStation: WeatherStation;
}

// Weather state color definitions (5-level system)
export interface WeatherColorConfig {
  id: string;
  name: string;
  emoji: string;
  precipitation: [number, number]; // [min, max] mm/h
  cloudCoverage: [number, number]; // [min, max] %
  colors: {
    cloud: [number, number, number, number]; // RGBA
    rain: [number, number, number, number];  // RGBA
    ambient: [number, number, number];       // RGB
    sky: { brightness: number; contrast: number };
  };
}