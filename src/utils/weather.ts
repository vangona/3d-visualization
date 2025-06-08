import { WeatherStation, WeatherColorConfig } from '@/types/weather';
import { WEATHER_STATES } from '@/constants/weather';

// Function to determine weather state based on precipitation and cloud coverage
export const getWeatherState = (precipitation: number, cloudCoverage: number): WeatherColorConfig => {
  for (const state of WEATHER_STATES) {
    const [minPrec, maxPrec] = state.precipitation;
    const [minCloud, maxCloud] = state.cloudCoverage;
    
    if (precipitation >= minPrec && precipitation <= maxPrec && 
        cloudCoverage >= minCloud && cloudCoverage <= maxCloud) {
      return state;
    }
  }
  
  // Fallback: determine by precipitation level
  if (precipitation >= 10) return WEATHER_STATES[4]; // heavy_rain
  if (precipitation >= 2) return WEATHER_STATES[3];  // rainy
  if (precipitation >= 0.5) return WEATHER_STATES[2]; // cloudy
  if (cloudCoverage >= 20) return WEATHER_STATES[1]; // partly_cloudy
  return WEATHER_STATES[0]; // clear
};

// Helper function to get weather display for station
export const getWeatherDisplay = (station: WeatherStation): string => {
  const weatherState = getWeatherState(station.weather.precipitation, station.weather.cloudCoverage);
  return `${weatherState.name} ${weatherState.emoji}`;
};

// Calculate weather effect configuration based on overall weather
export const calculateWeatherEffects = (stations: WeatherStation[]) => {
  const avgPrecipitation = stations.reduce((sum, s) => sum + s.weather.precipitation, 0) / stations.length;
  const avgCloudCoverage = stations.reduce((sum, s) => sum + s.weather.cloudCoverage, 0) / stations.length;
  
  // 평균 날씨 상태 결정
  const overallWeatherState = getWeatherState(avgPrecipitation, avgCloudCoverage);
  
  // 날씨 상태에 따른 밝기와 대비 적용
  const { brightness, contrast } = overallWeatherState.colors.sky;
  
  // 조명 색상도 날씨 상태에 따라 조정
  const [ambientR, ambientG, ambientB] = overallWeatherState.colors.ambient;
  const ambientColor = [ambientR / 255, ambientG / 255, ambientB / 255];
  
  return { 
    brightness, 
    contrast,
    ambientColor,
    weatherState: overallWeatherState
  };
};