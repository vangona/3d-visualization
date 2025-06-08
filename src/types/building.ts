// 건물 및 도로 시각화 관련 타입 정의

export interface BuildingFeature {
  properties: {
    height?: number;
    type?: string;
    class?: string;
    layer?: string;
  };
  geometry: {
    type: string;
    coordinates: number[][][] | number[][];
  };
}

export interface RoadFeature {
  properties: {
    class?: string;
    type?: string;
    structure?: string;
    layer?: string;
  };
  geometry: {
    type: string;
    coordinates: number[][] | number[][][];
  };
}

export interface WeatherEffect {
  buildingColor: [number, number, number, number];
  roadColor: [number, number, number, number];
  waterColor: [number, number, number, number];
  elevation: number;
}

export interface MVTLayerProps {
  weatherStations: WeatherStation[];
  viewState: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
}

interface WeatherStation {
  id: string;
  name: string;
  location: {
    longitude: number;
    latitude: number;
  };
  weather: {
    precipitation: number;
    cloudCoverage: number;
  };
}