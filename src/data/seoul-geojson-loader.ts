// GeoJSON 파일을 동적으로 로드하기 위한 함수

// 서울시 구별 GeoJSON 데이터를 처리하는 유틸리티
export interface SeoulDistrictFeature {
  type: "Feature";
  properties: {
    sggnm: string;     // 구 이름 (강남구, 서초구 등)
    adm_nm: string;    // 전체 행정명
    precipitation?: number; // 강수량 추가
  };
  geometry: {
    type: "MultiPolygon";
    coordinates: number[][][][];
  };
}

export interface SeoulGeoJSON {
  type: "FeatureCollection";
  features: SeoulDistrictFeature[];
}

// GeoJSON 데이터 로드 및 구별로 그룹화
export async function loadSeoulDistrictsGeoJSON(): Promise<SeoulGeoJSON> {
  const response = await fetch('/data/hangjeongdong_서울특별시.geojson');
  const geoJSON = await response.json();
  return geoJSON as SeoulGeoJSON;
}

// 특정 구의 Feature들을 필터링
export function getDistrictFeatures(districtName: string, geoJSON: SeoulGeoJSON): SeoulDistrictFeature[] {
  return geoJSON.features.filter(feature => 
    feature.properties.sggnm === districtName
  );
}

// 비가 오는 구들만 필터링
export async function getRainingDistrictsGeoJSON(
  rainingDistrictNames: string[], 
  precipitationData: Record<string, number>
): Promise<SeoulGeoJSON> {
  const fullGeoJSON = await loadSeoulDistrictsGeoJSON();
  
  const filteredFeatures = fullGeoJSON.features.filter(feature => 
    rainingDistrictNames.includes(feature.properties.sggnm)
  ).map(feature => ({
    ...feature,
    properties: {
      ...feature.properties,
      precipitation: precipitationData[feature.properties.sggnm] || 0
    }
  }));

  return {
    type: "FeatureCollection",
    features: filteredFeatures
  };
}

// 구 중심점 계산 (bbox 중심점)
export async function getDistrictCenter(districtName: string): Promise<[number, number] | null> {
  const geoJSON = await loadSeoulDistrictsGeoJSON();
  const districtFeatures = getDistrictFeatures(districtName, geoJSON);
  
  if (districtFeatures.length === 0) return null;
  
  // 모든 좌표를 수집하여 중심점 계산
  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  
  districtFeatures.forEach(feature => {
    feature.geometry.coordinates.forEach(polygon => {
      polygon.forEach(ring => {
        ring.forEach(coord => {
          const [lng, lat] = coord;
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        });
      });
    });
  });
  
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
}