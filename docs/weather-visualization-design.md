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

### 10.5 기술적 해결 내역
- ✅ PostProcessEffect 셰이더 오류 해결 (제거 후 지도 스타일로 대체)
- ✅ TypeScript 타입 호환성 문제 해결
- ✅ 비 파티클 수평 이동 문제 해결 (수직 낙하로 수정)
- ✅ 지도 어두움 문제 해결 (밝은 테마 적용)

## 11. 현재 구현 상태

### 11.1 완성된 기능
```typescript
// 주요 컴포넌트
- WeatherVisualization.tsx: 메인 날씨 시각화 컴포넌트
- 25개 서울 구역별 날씨 스테이션 목데이터
- 행정구역 경계 기반 구름/비 파티클 생성
- 지역 선택 및 자동 이동 기능
- 실시간 날씨 효과 애니메이션

// 데이터 구조
- 실제 서울 행정구역 GeoJSON (425개 동)
- WeatherStation 인터페이스
- CloudParticle, RainParticle 타입 정의
```

### 11.2 시각화 효과
- **구름**: 행정구역 내 랜덤 분포, 크기별 투명도 처리
- **비**: 수직 낙하, 구역별 강수량 반영
- **조명**: 날씨 상태별 ambient/directional 라이트 조정
- **지도**: 날씨에 따른 밝기 조정

### 11.3 사용자 인터페이스
- 좌측 패널: 지역 선택 드롭다운 (25개 구역)
- 날씨 정보: 각 구역별 현재 날씨 상태 표시
- 반응형 디자인: 모바일/데스크톱 지원

## 12. 향후 확장 가능성

- 기상청 API 연동 (현재 목데이터 사용)
- 번개 효과 추가
- 눈 파티클 시스템
- 안개 볼륨 렌더링
- 무지개 효과
- 시간대별 하늘 색상 변화 (일출/일몰)
- 실시간 데이터 업데이트
- 예보 정보 표시