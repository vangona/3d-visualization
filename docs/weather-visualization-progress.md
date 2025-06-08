# 날씨 시각화 프로젝트 진행 사항 문서

## 개요
이 문서는 초기 구름 색상 문제 해결 이후 진행된 모든 작업 내용을 정리합니다.

## 1. 코드 리팩토링 및 모듈화

### 1.1 대규모 리팩토링 완료
- **이전**: 869줄의 단일 컴포넌트 파일
- **이후**: 321줄로 축소, 모듈화된 구조
- **분리된 모듈**:
  - `/src/types/weather.ts` - 날씨 관련 타입 정의
  - `/src/types/building.ts` - 건물/도로 타입 정의
  - `/src/constants/weather.ts` - 날씨 상수
  - `/src/constants/buildingColors.ts` - 건물 색상 팔레트
  - `/src/utils/layerGenerators.ts` - 레이어 생성 유틸리티
  - `/src/utils/particleGenerators.ts` - 파티클 생성 로직
  - `/src/utils/mvtLayerGenerators.ts` - MVT 레이어 유틸리티
  - `/src/utils/simpleBuildingLayer.ts` - 3D 건물 레이어
  - `/src/utils/buildingEffects.ts` - 건물 효과 계산

### 1.2 사이드 이펙트 없는 함수 분리
- 순수 함수들을 별도 유틸리티로 분리
- 테스트 가능성 및 재사용성 향상

## 2. 주요 버그 수정

### 2.1 구름 색상 문제 해결
- **문제**: 구름이 날씨 상태와 관계없이 흰색으로 표시
- **원인**: 복잡한 WebGL 블렌딩 파라미터
- **해결**: 
  - 블렌딩 파라미터 단순화
  - 알파값 처리 로직 수정
  - 모든 날씨 상태에서 회색 구름으로 통일 `[220, 220, 230]`

### 2.2 성능 최적화
- **문제**: 의존성 배열의 객체로 인한 지속적인 재계산
- **해결**:
  ```typescript
  // 이전: useCallback 사용
  const getLayers = useCallback(() => {...}, [weatherStations, viewState])
  
  // 이후: useMemo 사용 및 원시값 의존성
  const layers = useMemo(() => {...}, [
    weatherStations, 
    seoulGeoJSON,
    cloudParticles,
    rainParticles,
    viewState.zoom,
    viewState.longitude,
    viewState.latitude
  ])
  ```

### 2.3 누락된 지역 데이터 추가
- **문제**: 용산구 등 일부 지역 데이터 누락
- **해결**: 모든 25개 서울시 구 데이터 표시

### 2.4 레이어 렌더링 문제
- **문제**: 바닥 영역, 구름, 비가 보이지 않음
- **해결**: 
  - 모든 구역을 표시하도록 로직 변경 (비오는 곳만 표시 → 전체 표시)
  - 날씨에 따른 색상 코딩 적용

### 2.5 비 애니메이션 정지 문제
- **문제**: 비 파티클이 멈춰있음
- **해결**: rainParticles에 대한 useMemo 제거로 업데이트 허용

### 2.6 고도 분리 문제
- **문제**: 비가 구름 위에서 내림
- **해결**: 
  - 구름 고도: 1600-2800m
  - 비 고도: 300-1500m

## 3. 줌 레벨 기반 차별화된 시각화 구현

### 3.1 시각화 레벨 설계
```typescript
// 줌 레벨별 시각화 전략
- zoom ≤ 11: 날씨 컬럼 (3D 원기둥)
- zoom 11-14: 구름 및 비 파티클
- zoom ≥ 13: 3D 건물
- zoom ≥ 15: 상세 건물/도로 (MVT)
```

### 3.2 날씨 컬럼 레이어 (Overview)
- 각 구의 강수량을 3D 원기둥으로 표현
- 높이는 강수량에 비례
- 색상은 날씨 상태 반영

### 3.3 점진적 전환 효과
```typescript
// 줌 레벨 기반 투명도 계산
const particleOpacity = Math.min(1, (currentZoom - 11) / 2);
```

## 4. 3D 건물 시각화 구현

### 4.1 간단한 3D 건물 레이어
- **구현 방식**: GeoJsonLayer with extrusion
- **주요 랜드마크 포함**:
  - 롯데월드타워 (554m)
  - 서울시청 (120m)
  - 경복궁 (25m)
  - 강남, 홍대, 여의도 지역 건물들

### 4.2 날씨 기반 건물 효과
```typescript
// 날씨에 따른 건물 색상
- 폭우: [100, 150, 255, 200] (진한 파랑)
- 비: [150, 180, 255, 200] (파랑)
- 약한 비: [200, 220, 255, 200] (연한 파랑)
- 흐림: [180, 180, 190, 200] (회색)
- 맑음: [255, 220, 150, 200] (노랑)
```

### 4.3 3D 렌더링 설정
```typescript
material: {
  ambient: 0.6,
  diffuse: 0.8,
  shininess: 32,
  specularColor: [255, 255, 255]
}
```

## 5. MVT 레이어 시도 (일시 보류)

### 5.1 구현 시도
- Mapbox Vector Tiles 사용하여 실제 건물/도로 데이터 표시
- TypeScript 호환성 문제로 require() 사용

### 5.2 타입 에러 해결
```typescript
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MVTLayer = require('@deck.gl/geo-layers').MVTLayer;
```

## 6. 날씨 시스템 개선

### 6.1 구름 시스템 변경
- **이전**: 날씨별 색상 변화
- **이후**: 날씨별 밀도(양) 변화
- 모든 구름 통일 색상: `[220, 220, 230]`

### 6.2 비 파티클 크기 조정
- 초기: 너무 작아서 안 보임
- 중간: 너무 커서 원처럼 보임
- 최종: 비의 시각적 이미지를 살린 적절한 크기

### 6.3 강수량 색상 일치
- UI 전체의 색상 일관성 유지
- 강수량 단계별 색상 통일

## 7. 성능 최적화 상세

### 7.1 메모이제이션 전략
- `useMemo`로 레이어 생성 최적화
- 뷰포트 기반 필터링으로 렌더링 파티클 수 제한
- 의존성 배열 최적화로 불필요한 재계산 방지

### 7.2 애니메이션 최적화
- 20fps로 부드러운 비 애니메이션
- 프레임별 파티클 위치 업데이트

## 8. TypeScript 에러 전체 수정

### 8.1 주요 수정 사항
- MVTLayer 임포트 문제 해결
- GeoJsonLayer 타입 어서션 추가
- building.ts MVTLayerProps 인터페이스 타입 정의
- 모든 컴파일 에러 해결

## 9. 현재 상태 요약

### 9.1 완성된 기능
- ✅ 5단계 날씨 상태 시각화
- ✅ 줌 레벨별 차별화된 시각화
- ✅ 3D 건물 렌더링
- ✅ 구름 밀도 기반 날씨 표현
- ✅ 비 애니메이션
- ✅ 전체 구역 표시
- ✅ 성능 최적화
- ✅ TypeScript 완전 지원

### 9.2 기술 스택
- deck.gl 9.0
- React 19
- Next.js 15.3.3
- TypeScript (strict mode)
- Mapbox GL JS
- Tailwind CSS 4

### 9.3 향후 개선 가능 사항
- 실제 날씨 API 연동
- 실시간 건물 데이터 (MVT 완전 구현)
- 더 많은 날씨 효과 (눈, 안개 등)
- 모바일 최적화 강화

## 10. 주요 학습 사항

### 10.1 deck.gl 3D 시각화
- `extruded: true`로 2D 폴리곤을 3D로 변환
- 조명 효과로 입체감 향상
- 머티리얼 설정으로 표면 질감 표현

### 10.2 React 성능 최적화
- 의존성 배열 관리의 중요성
- 객체 vs 원시값 의존성
- 메모이제이션 전략

### 10.3 복잡한 시각화 디버깅
- 콘솔 로그를 통한 레이어 생성 추적
- 단계별 문제 해결 접근법
- 시각적 피드백의 중요성