import * as turf from '@turf/turf';
import { WeatherStation, DongInfo } from '@/types/weather';
import { SEOUL_DISTRICTS, WEATHER_SCENARIOS } from '@/constants/weather';
import { SeoulGeoJSON } from '@/data/seoul-geojson-loader';

// Mock weather stations data for Seoul - All 25 districts
export const generateMockWeatherStations = (): WeatherStation[] => {
  return SEOUL_DISTRICTS.map((district, index) => {
    const scenario = WEATHER_SCENARIOS[index % WEATHER_SCENARIOS.length];
    return {
      id: `station-${index}`,
      name: district.name,
      location: {
        longitude: district.lng,
        latitude: district.lat,
      },
      weather: {
        precipitation: scenario.precipitation,
        temperature: 15 + Math.random() * 10,
        humidity: 60 + scenario.cloudCoverage * 0.3,
        windSpeed: 2 + Math.random() * 5,
        windDirection: Math.random() * 360,
        cloudCoverage: scenario.cloudCoverage,
        visibility: 10000 - scenario.cloudCoverage * 80,
        timestamp: new Date().toISOString(),
      },
    };
  });
};

// Generate dong data from GeoJSON and associate with gu weather stations
export const generateDongData = (geoJSON: SeoulGeoJSON | null, weatherStations: WeatherStation[]): DongInfo[] => {
  if (!geoJSON) return [];
  
  const dongList: DongInfo[] = [];
  
  geoJSON.features.forEach((feature) => {
    const fullName = feature.properties.adm_nm;
    const guName = feature.properties.sggnm;
    
    // Extract dong name (remove Seoul + gu prefix)
    const parts = fullName.split(' ');
    const dongName = parts[parts.length - 1]; // Last part is dong name
    
    // Find corresponding weather station for this gu
    const guWeatherStation = weatherStations.find(station => station.name === guName);
    if (!guWeatherStation) return;
    
    // Calculate centroid of the dong
    try {
      const centroid = turf.centroid(feature);
      const center: [number, number] = [
        centroid.geometry.coordinates[0],
        centroid.geometry.coordinates[1]
      ];
      
      dongList.push({
        dongName,
        guName,
        fullName,
        center,
        guWeatherStation
      });
    } catch (error) {
      console.warn(`Failed to calculate centroid for ${fullName}:`, error);
    }
  });
  
  return dongList;
};