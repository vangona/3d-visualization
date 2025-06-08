# 기상청 API 기반 날씨 시각화 설계 문서

## 1. 개요

deck.gl을 활용하여 기상청 API의 강수량 데이터를 기반으로 실시간 날씨 상태를 3D로 시각화하는 시스템을 구현합니다.

### 1.1 주요 목표
- 강수량에 따른 구름 밀도 및 색상 변화
- 비 파티클 효과의 동적 생성
- 날씨 상태별 하늘 배경 및 조명 효과
- 실시간 데이터 업데이트 지원

## 2. 시각화 컴포넌트 구조

### 2.1 레이어 계층 구조
```
WeatherVisualization
├── SkyBackground (PostProcessEffect)
├── CloudLayer (PointCloudLayer)
├── RainParticleLayer (Custom PointCloudLayer)
├── WeatherStationLayer (ScatterplotLayer)
└── LightingSystem (LightingEffect)
```

### 2.2 날씨 상태 정의

| 날씨 상태 | 강수량 범위 | 구름 밀도 | 비 입자 | 하늘 색상 | 조명 강도 |
|----------|------------|----------|---------|-----------|----------|
| 맑음 | 0mm | 0-10% | 없음 | 밝은 파랑 | 100% |
| 구름 조금 | 0-0.1mm | 10-30% | 없음 | 연한 파랑 | 80% |
| 흐림 | 0.1-1mm | 30-70% | 없음 | 회색 | 60% |
| 약한 비 | 1-5mm | 70-85% | 적음 | 어두운 회색 | 40% |
| 보통 비 | 5-20mm | 85-95% | 보통 | 진한 회색 | 30% |
| 강한 비 | 20mm+ | 95-100% | 많음 | 매우 어두움 | 20% |

## 3. 데이터 구조 설계

### 3.1 기상 데이터 인터페이스
```typescript
interface WeatherStation {
  id: string;
  name: string;
  location: {
    longitude: number;
    latitude: number;
  };
  weather: WeatherData;
}

interface WeatherData {
  precipitation: number;      // 강수량 (mm/h)
  temperature: number;        // 온도 (°C)
  humidity: number;          // 습도 (%)
  windSpeed: number;         // 풍속 (m/s)
  windDirection: number;     // 풍향 (도)
  cloudCoverage: number;     // 구름양 (0-100%)
  visibility: number;        // 가시거리 (m)
  timestamp: string;         // ISO 8601 형식
}
```

### 3.2 시각화 데이터 인터페이스
```typescript
interface CloudParticle {
  position: [number, number, number];  // [lng, lat, altitude]
  size: number;                       // 구름 입자 크기
  density: number;                    // 밀도 (0-1)
  color: [number, number, number];    // RGB
  opacity: number;                    // 투명도 (0-1)
}

interface RainParticle {
  id: string;
  position: [number, number, number];  // [lng, lat, altitude]
  velocity: [number, number, number];  // [vx, vy, vz]
  size: number;                       // 빗방울 크기
  lifetime: number;                   // 생존 시간 (초)
}

interface WeatherEffectConfig {
  skyBrightness: number;      // 0-1
  skyContrast: number;        // 0-1
  fogDensity: number;         // 0-1
  lightIntensity: number;     // 0-1
  ambientColor: [number, number, number];
  sunlightColor: [number, number, number];
}
```

## 4. 구현 세부사항

### 4.1 구름 생성 알고리즘
```typescript
function generateClouds(weatherData: WeatherData): CloudParticle[] {
  const cloudCount = Math.floor(weatherData.cloudCoverage * 10);
  const baseAltitude = 1000 + (1 - weatherData.cloudCoverage / 100) * 2000;
  
  // Perlin noise를 사용한 자연스러운 구름 분포
  // 강수량에 따른 구름 색상 및 밀도 조정
}
```

### 4.2 비 파티클 시스템
```typescript
class RainParticleSystem {
  particles: RainParticle[];
  emissionRate: number;  // 초당 생성 파티클 수
  
  update(deltaTime: number): void {
    // 파티클 위치 업데이트
    // 수명이 다한 파티클 제거
    // 새 파티클 생성
  }
}
```

### 4.3 PostProcessEffect 설정
- **맑은 날**: brightness: 1.0, contrast: 1.0, 파란 하늘 필터
- **흐린 날**: brightness: 0.7, contrast: 0.8, 회색 필터
- **비오는 날**: brightness: 0.4, contrast: 0.6, 어두운 필터

## 5. 성능 최적화 전략

### 5.1 레벨 오브 디테일 (LOD)
- 거리에 따른 구름/비 파티클 밀도 조정
- 뷰포트 외부 파티클 컬링

### 5.2 파티클 풀링
- 비 파티클 재사용으로 메모리 할당 최소화
- 최대 파티클 수 제한 (10,000개)

### 5.3 업데이트 빈도
- 날씨 데이터: 5분마다
- 파티클 애니메이션: 60fps
- 구름 위치: 1초마다

## 6. 사용자 인터페이스

### 6.1 컨트롤 패널
- 날씨 상태 선택 (자동/수동)
- 시간대별 날씨 변화 시뮬레이션
- 지역 선택
- 시각화 옵션 (구름/비/조명 토글)

### 6.2 정보 표시
- 현재 날씨 상태
- 강수량 수치
- 온도/습도/풍속
- 예보 정보

## 7. 구현 로드맵

### Phase 1: 기본 구조 (목데이터)
1. WeatherVisualization 컴포넌트 생성
2. 목데이터 생성기 구현
3. 기본 레이어 구조 설정

### Phase 2: 시각화 효과
1. 구름 레이어 구현
2. 비 파티클 시스템 구현
3. 날씨별 PostProcessEffect 적용
4. LightingEffect 설정

### Phase 3: 상호작용
1. 날씨 상태 전환 애니메이션
2. 사용자 컨트롤 추가
3. 실시간 업데이트 시뮬레이션

### Phase 4: API 연동
1. 기상청 API 연동 준비
2. 데이터 변환 로직
3. 실시간 업데이트 구현

## 8. 기술 스택

### 8.1 핵심 라이브러리
- deck.gl v9.0+
- @deck.gl/core: PostProcessEffect, LightingEffect
- @deck.gl/layers: PointCloudLayer, ScatterplotLayer
- @deck.gl/react: React 통합

### 8.2 추가 라이브러리
- @luma.gl/effects: 셰이더 효과
- react-map-gl: 지도 기반
- TypeScript: 타입 안정성

## 9. 예상 결과물

### 9.1 맑은 날 시각화
- 밝고 선명한 하늘
- 최소한의 구름
- 강한 그림자와 조명

### 9.2 비오는 날 시각화
- 어두운 구름층
- 떨어지는 빗방울 애니메이션
- 흐릿한 시야와 약한 조명

### 9.3 전환 효과
- 날씨 변화 시 부드러운 전환
- 구름 이동 애니메이션
- 점진적인 비 시작/중단

## 10. 구현 완료 내역

### 10.1 Phase 1 완료 (2025.06.07)
- ✅ WeatherVisualization 컴포넌트 생성 (`/src/components/WeatherVisualization.tsx`)
- ✅ 목데이터 생성기 구현 (서울 25개 구역 날씨 스테이션)
- ✅ 기본 레이어 구조 설정

### 10.2 Phase 2 완료
- ✅ 구름 레이어 구현 (PointCloudLayer 기반)
- ✅ 비 파티클 시스템 구현 (수직 낙하 애니메이션)
- ✅ 날씨별 조명 효과 적용 (LightingEffect)
- ✅ PostProcessEffect 시도 → 지도 스타일 변경으로 대체

### 10.3 Phase 3 완료
- ✅ 날씨 시각화를 기본 뷰로 설정
- ✅ 지역 선택 컨트롤러 구현 (25개 구역 네비게이션)
- ✅ 실시간 파티클 애니메이션 구현

### 10.4 Seoul 행정구역 통합 완료
- ✅ 실제 서울 행정구역 GeoJSON 데이터 적용 (`/public/data/hangjeongdong_서울특별시.geojson`)
- ✅ 원형 마커 제거, 행정구역 경계 기반 날씨 효과 구현
- ✅ turf.js를 이용한 polygon 내부 파티클 생성
- ✅ 425개 실제 행정동 데이터 활용

### 10.5 동 단위 시각화 확장 완료 (2025.06.07)
- ✅ DongInfo 인터페이스 정의 및 데이터 구조화
- ✅ generateDongData 함수로 425개 동 데이터 생성
- ✅ turf.centroid를 이용한 각 동별 중심점 계산
- ✅ 구별 날씨 스테이션과 동 단위 표시 연결
- ✅ 계층적 지역 선택 UI 구현 (구/동 분리)
- ✅ 구별 그룹화된 동 목록 표시
- ✅ 동 선택시 상세 줌 레벨 적용

### 10.6 기술적 해결 내역
- ✅ PostProcessEffect 셰이더 오류 해결 (제거 후 지도 스타일로 대체)
- ✅ TypeScript 타입 호환성 문제 해결
- ✅ 비 파티클 수평 이동 문제 해결 (수직 낙하로 수정)
- ✅ 지도 어두움 문제 해결 (밝은 테마 적용)

## 11. 현재 구현 상태

### 11.1 완성된 기능
```typescript
// 주요 컴포넌트
- WeatherVisualization.tsx: 메인 날씨 시각화 컴포넌트
- 25개 서울 구별 날씨 스테이션 (구 단위 날씨 데이터 관리)
- 425개 서울 동별 위치 표시 (동 단위 세부 네비게이션)
- 행정구역 경계 기반 구름/비 파티클 생성
- 계층적 지역 선택 및 자동 이동 기능
- 실시간 날씨 효과 애니메이션

// 데이터 구조
- 실제 서울 행정구역 GeoJSON (425개 동)
- WeatherStation 인터페이스 (25개 구별 날씨 관리)
- DongInfo 인터페이스 (425개 동별 위치 및 구 연결)
- CloudParticle, RainParticle 타입 정의

// 핵심 함수
- generateMockWeatherStations(): 25개 구별 날씨 스테이션 생성
- generateDongData(): 425개 동 데이터 생성 및 구 연결
- generateCloudParticles(): 행정구역 기반 구름 파티클
- generateRainParticles(): 행정구역 기반 비 파티클
```

### 11.2 시각화 효과
- **구름**: 행정구역 내 랜덤 분포, 크기별 투명도 처리
- **비**: 수직 낙하, 구역별 강수량 반영
- **조명**: 날씨 상태별 ambient/directional 라이트 조정
- **지도**: 날씨에 따른 밝기 조정

### 11.3 사용자 인터페이스
- 좌측 패널: 계층적 지역 선택 드롭다운
  - 🏙️ 전체 보기
  - 📍 구 단위 선택 (25개 구)
  - 🏘️ 동 단위 선택 (425개 동, 구별 그룹화)
- 날씨 정보: 각 구역별 현재 날씨 상태 표시
- 반응형 디자인: 모바일/데스크톱 지원
- 스마트 줌: 구 선택시 줌 12, 동 선택시 줌 14로 자동 조정

## 12. 동 단위 확장 아키텍처

### 12.1 설계 원칙
- **날씨 데이터**: 구 단위(25개)에서 관리하여 성능 최적화
- **위치 표시**: 동 단위(425개)까지 상세 네비게이션 지원
- **연결 구조**: 각 동은 해당 구의 날씨 스테이션 데이터 참조

### 12.2 기술적 구현
```typescript
interface DongInfo {
  dongName: string;              // 동 이름 (예: "역삼동")
  guName: string;                // 구 이름 (예: "강남구")
  fullName: string;              // 전체 이름 (예: "서울특별시 강남구 역삼동")
  center: [number, number];      // 동의 중심점 좌표 (turf.centroid 계산)
  guWeatherStation: WeatherStation; // 해당 구의 날씨 스테이션 참조
}
```

### 12.3 데이터 처리 플로우
1. **GeoJSON 로드**: 서울시 425개 동 경계 데이터
2. **중심점 계산**: turf.centroid로 각 동의 중심 좌표 산출
3. **구 매핑**: 동명에서 구명 추출하여 날씨 스테이션 연결
4. **그룹화**: 구별로 동 목록 정렬하여 UI 표시
5. **네비게이션**: 선택시 해당 동 중심으로 자동 이동

### 12.4 사용자 경험
- **계층적 선택**: 구 → 동 순서로 점진적 상세화
- **스마트 줌**: 구(줌12) vs 동(줌14) 자동 조정
- **날씨 연동**: 동 선택시 해당 구의 실시간 날씨 표시
- **검색 편의**: "구의동", "역삼동" 등 직접 검색 가능

## 13. 5단계 날씨 색상 시스템 구현 완료 (2025.06.08)

### 13.1 WeatherColorConfig 시스템
```typescript
interface WeatherColorConfig {
  id: string;                              // 날씨 상태 ID
  name: string;                           // 한글 이름
  emoji: string;                          // 이모지 표시
  precipitation: [number, number];        // [최소, 최대] 강수량 범위 (mm/h)
  cloudCoverage: [number, number];        // [최소, 최대] 구름양 범위 (%)
  colors: {
    cloud: [number, number, number, number];  // 구름 색상 RGBA
    rain: [number, number, number, number];   // 비 색상 RGBA
    ambient: [number, number, number];        // 주변광 색상 RGB
    sky: { brightness: number; contrast: number }; // 하늘 밝기/대비
  };
}
```

### 13.2 5단계 날씨 상태 정의
| 단계 | 상태 | 강수량 범위 | 구름양 범위 | 구름 색상 | 특징 |
|------|------|------------|------------|----------|------|
| 1 | 맑음 ☀️ | 0mm | 0-20% | 매우 희미한 흰색 | 밝고 선명한 하늘 |
| 2 | 구름조금 ⛅ | 0-0.5mm | 20-50% | 밝은 흰색 | 부드러운 노란빛 |
| 3 | 흐림 ☁️ | 0.5-2mm | 50-75% | 밝은 회색 | 차가운 회색빛 |
| 4 | 비 🌧️ | 2-10mm | 75-90% | 중간 회색 | 파란빛 비 |
| 5 | 폭우 ⛈️ | 10-50mm | 90-100% | 어두운 회색 | 짙은 남색 비 |

### 13.3 구현된 핵심 기능
- ✅ **동적 날씨 상태 결정**: `getWeatherState()` 함수로 강수량과 구름양 기반 자동 분류
- ✅ **색상 범례 UI**: 사이드패널에 5단계 색상 표시
- ✅ **조명 시스템**: 날씨 상태별 ambient/directional 조명 자동 조정
- ✅ **하늘 밝기**: 날씨에 따른 brightness/contrast 실시간 변경
- ✅ **구름 효과**: 날씨별 구름 색상, 크기, 투명도 차별화
- ✅ **비 효과**: 강수량별 비 속도, 크기, 밀도 조정

## 14. 구름 렌더링 개선 완료

### 14.1 메타볼 효과 시도 및 최적화
- ✅ **클러스터 기반 생성**: 구름을 클러스터 단위로 생성하여 자연스러운 분포
- ✅ **거리 기반 투명도**: 클러스터 중심에서 거리에 따른 페이드 효과
- ✅ **크기 다양성**: 30% 중간, 40% 큰, 30% 매우 큰 크기로 분포
- ✅ **이중 레이어 렌더링**: 기본 구름 + 그림자 레이어로 입체감 표현
- ✅ **색상 변화**: 미세한 색상 변화로 자연스러운 구름 표현

### 14.2 기술적 구현 세부사항
```typescript
// 클러스터 기반 구름 생성
const clusterCount = Math.floor(cloudDensity * 8) + 2;
const particlesPerCluster = Math.floor(cloudDensity * 15) + 8;

// 거리 기반 투명도 계산
const distanceFromClusterCenter = distance / spreadRadius;
const fadeEffect = Math.pow(1 - distanceFromClusterCenter, 1.5);
const clusterOpacity = baseOpacity * fadeEffect * (0.6 + Math.random() * 0.4);

// 이중 레이어 구름 렌더링
- 기본 레이어: ScatterplotLayer with billboard=true
- 그림자 레이어: 300m 아래에 어두운 구름으로 입체감 표현
```

## 15. 구 단위 날씨 표시 완료 (2025.06.08)

### 15.1 문제점 및 해결
**문제**: 구름과 비가 특정 동에만 나타나는 현상
**해결**: 구별 모든 동 features를 그룹화하여 전체 구 영역에 날씨 효과 적용

### 15.2 기술적 구현
```typescript
// 해당 구의 모든 동 features 찾기
const districtFeatures = geoJSON.features.filter((f: SeoulDistrictFeature) => 
  f.properties.sggnm === station.name
);

// 구 전체의 bbox 계산
const districtCollection = turf.featureCollection(districtFeatures);
const bbox = turf.bbox(districtCollection);

// 구 영역 내 파티클 생성 시 모든 동 polygon 체크
const isInDistrict = districtFeatures.some((feature) => 
  turf.booleanPointInPolygon(point, feature)
);
```

### 15.3 개선된 날씨 표시
- ✅ **전체 구 커버리지**: 각 구의 모든 동 영역에 날씨 효과 표시
- ✅ **정확한 경계 체크**: turf.js의 point-in-polygon으로 정확한 위치 검증
- ✅ **구별 일관성**: 같은 구 내 모든 동이 동일한 날씨 상태 표시
- ✅ **성능 최적화**: 구별 bbox를 이용한 효율적인 파티클 생성

### 15.4 최종 구현 상태
- **25개 구**: 모든 서울시 구에 날씨 스테이션 운영
- **425개 동**: 동 단위 네비게이션 지원하되 날씨는 구 단위 관리
- **정확한 경계**: 실제 행정구역 경계에 맞춘 구름/비 표시
- **일관된 UX**: 구 선택 시 해당 구 전체 영역에 날씨 효과 표시

## 16. 향후 확장 가능성

- 기상청 API 연동 (현재 목데이터 사용)
- 동별 상세 날씨 데이터 (미세먼지, 온도 차이 등)
- 번개 효과 추가
- 눈 파티클 시스템
- 안개 볼륨 렌더링
- 무지개 효과
- 시간대별 하늘 색상 변화 (일출/일몰)
- 실시간 데이터 업데이트
- 예보 정보 표시