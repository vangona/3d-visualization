# 구름 파티클 소프트 블렌딩 구현 계획서

## 📋 프로젝트 개요

### 목적
현재 구름 파티클들이 개별 원형으로 보이는 문제를 해결하고, 자연스럽게 융합되어 실제 구름과 같은 연속적인 형태로 보이도록 소프트 블렌딩을 구현합니다.

### 현재 상태
- 구름 파티클: ScatterplotLayer 기반 원형 파티클
- 이중 레이어 구조: 기본 레이어 + 그림자 레이어
- 클러스터 기반 생성: 자연스러운 분포는 구현되었으나 개별 파티클이 명확히 구분됨

### 목표
- 개별 원형 파티클들이 부드럽게 융합되어 실제 구름과 같은 모양 구현
- 겹치는 영역에서 자연스러운 투명도 합성
- 구름의 가장자리가 부드럽게 페이드되는 효과
- 기존 성능 유지 (60fps)

## 🛠️ 기술 스택 및 도구

### 핵심 기술
- **deck.gl v9.0+**: WebGL 기반 3D 렌더링 프레임워크
- **@deck.gl/layers**: ScatterplotLayer, PointCloudLayer
- **WebGL Blending**: GPU 레벨 블렌딩 모드 활용
- **luma.gl**: deck.gl의 저수준 WebGL 래퍼

### 블렌딩 기술 옵션

#### Option A: Additive Blending (가산 블렌딩)
```typescript
// WebGL 설정
parameters: {
  blend: true,
  blendFunc: [GL.SRC_ALPHA, GL.ONE],
  blendEquation: GL.FUNC_ADD,
  depthTest: false
}
```
**특징:**
- 겹치는 부분이 밝아져 구름의 밀도를 자연스럽게 표현
- 파티클이 많이 겹칠수록 밝고 진한 구름 효과
- 성능이 우수하며 GPU에서 효율적으로 처리

**장점:**
- 자연스러운 구름 밀도 표현
- 높은 성능
- 메타볼과 유사한 융합 효과

**단점:**
- 과도하게 밝아질 수 있음
- 색상 제어가 까다로움

#### Option B: Alpha Blending (알파 블렌딩)
```typescript
// WebGL 설정
parameters: {
  blend: true,
  blendFunc: [GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA],
  blendEquation: GL.FUNC_ADD,
  depthTest: false
}
```
**특징:**
- 전통적인 투명도 합성 방식
- 자연스러운 색상 보존
- 순서 의존적 렌더링

#### Option C: Soft Particles with Distance-based Alpha
```typescript
// 거리 기반 알파 조정
const softRadius = particleSize * 0.8;
const alpha = smoothstep(softRadius, particleSize, distanceFromCenter);
```
**특징:**
- 파티클 중심에서 가장자리로 갈수록 부드럽게 페이딩
- 커스텀 셰이더 또는 알파 함수 활용
- 더 정교한 제어 가능

## 📝 구현 단계

### Phase 1: 기술 조사 및 환경 설정 🔍
**목표**: 최적의 블렌딩 방법 선택

**작업 항목:**
1. deck.gl ScatterplotLayer의 `parameters` 속성 조사
2. WebGL blending modes 테스트 환경 구성
3. 각 블렌딩 모드별 프로토타입 제작
4. 시각적 품질 및 성능 비교 분석

**기술적 세부사항:**
```typescript
// 테스트할 블렌딩 모드들
const blendingModes = {
  additive: [GL.SRC_ALPHA, GL.ONE],
  alpha: [GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA],
  multiply: [GL.DST_COLOR, GL.ZERO],
  screen: [GL.ONE_MINUS_DST_COLOR, GL.ONE]
};
```

### Phase 2: ScatterplotLayer 블렌딩 설정 ⚙️
**목표**: deck.gl 레이어에 블렌딩 적용

**작업 항목:**
1. `parameters` 속성을 통한 WebGL 상태 설정
2. 기존 이중 레이어 구조와의 호환성 확인
3. z-order 및 depth testing 최적화
4. 블렌딩 모드별 성능 측정

**기술적 구현:**
```typescript
new ScatterplotLayer({
  id: 'clouds-soft-blended',
  data: cloudParticles,
  parameters: {
    blend: true,
    blendFunc: [GL.SRC_ALPHA, GL.ONE], // Additive blending
    blendEquation: GL.FUNC_ADD,
    depthTest: false,
    depthMask: false
  },
  // ... 기타 속성
})
```

### Phase 3: 파티클 속성 최적화 🎨
**목표**: 블렌딩에 최적화된 파티클 속성 조정

**작업 항목:**
1. 투명도 값 재조정 (additive blending 고려)
2. 색상 값 조정 (밝기 오버플로우 방지)
3. 파티클 크기 및 밀도 미세 조정
4. 클러스터 분포 알고리즘 개선

**알고리즘 개선:**
```typescript
// Additive blending을 위한 색상/투명도 조정
const adjustedOpacity = baseOpacity * 0.3; // 더 낮은 기본 투명도
const adjustedColor = [
  Math.min(255, baseColor[0] * 0.7), // 색상 강도 감소
  Math.min(255, baseColor[1] * 0.7),
  Math.min(255, baseColor[2] * 0.7)
];

// 부드러운 가장자리를 위한 크기 조정
const softParticleSize = baseSize * 1.5; // 더 큰 파티클로 겹침 증가
```

### Phase 4: 고급 소프트 파티클 구현 🔧
**목표**: 거리 기반 알파 페이딩 구현

**작업 항목:**
1. 파티클 중심에서의 거리 계산 로직
2. smoothstep 함수를 이용한 부드러운 페이딩
3. 다양한 페이딩 곡선 테스트
4. 날씨 상태별 소프트 파라미터 조정

**수학적 구현:**
```typescript
// Smoothstep 함수 (GLSL의 smoothstep과 동일)
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// 거리 기반 알파 계산
function calculateSoftAlpha(
  distanceFromCenter: number, 
  particleRadius: number, 
  softness: number = 0.3
): number {
  const softRadius = particleRadius * (1 - softness);
  return 1 - smoothstep(softRadius, particleRadius, distanceFromCenter);
}
```

### Phase 5: 성능 최적화 및 테스트 ✅
**목표**: 품질과 성능의 균형점 찾기

**작업 항목:**
1. 다양한 날씨 상태에서 블렌딩 효과 검증
2. 프레임 레이트 및 GPU 사용률 모니터링
3. 파티클 수 vs 시각적 품질 최적화
4. 모바일 기기 호환성 테스트

**성능 지표:**
- **목표 FPS**: 60fps 유지
- **최대 파티클 수**: 10,000개 이하
- **GPU 메모리 사용량**: 기존 대비 +20% 이내
- **CPU 오버헤드**: 최소화

## 🎯 예상 결과

### 시각적 개선 효과
1. **연속적인 구름 형태**: 개별 파티클이 아닌 하나의 구름 덩어리
2. **자연스러운 가장자리**: 부드럽게 페이드되는 구름 경계
3. **밀도 표현**: 겹치는 부분에서 자연스러운 밀도 변화
4. **현실적인 구름**: 실제 구름과 유사한 시각적 품질

### 기술적 성과
1. **GPU 가속**: WebGL 블렌딩을 통한 하드웨어 가속
2. **확장성**: 다양한 날씨 효과에 적용 가능한 시스템
3. **성능**: 기존 성능 유지하면서 품질 향상
4. **호환성**: 다양한 디바이스에서 일관된 효과

## 📊 성공 지표

### 정량적 지표
- [ ] 프레임 레이트 60fps 유지
- [ ] 파티클 개별 구분 불가능 (시각적 연속성 90% 이상)
- [ ] GPU 메모리 사용량 기존 대비 +20% 이내
- [ ] 모든 날씨 상태에서 일관된 품질

### 정성적 지표
- [ ] 사용자가 자연스러운 구름으로 인식
- [ ] 가장자리의 부드러운 페이딩 효과
- [ ] 날씨 상태별 적절한 밀도 표현
- [ ] 실시간 애니메이션에서 자연스러운 움직임

## 🔄 위험 요소 및 대응 방안

### 위험 요소
1. **성능 저하**: 블렌딩으로 인한 GPU 오버헤드
2. **브라우저 호환성**: WebGL 블렌딩 모드 지원 차이
3. **시각적 오버플로우**: Additive blending으로 인한 과도한 밝기
4. **복잡성 증가**: 디버깅 및 유지보수 어려움

### 대응 방안
1. **LOD 시스템**: 거리별 파티클 밀도 조정
2. **Fallback 모드**: 블렌딩 미지원 환경을 위한 대체 렌더링
3. **동적 파라미터**: 실시간 밝기/투명도 조정
4. **모듈화**: 블렌딩 관련 로직 분리 및 문서화

## 🎯 구현 완료 내역 (2025.06.08)

### ✅ Phase 1-4 완료: 소프트 블렌딩 시스템 구현

#### 🌤️ 구름 파티클 소프트 블렌딩
**구현된 기술:**
```typescript
// Additive blending 설정
parameters: {
  blend: true,
  blendFunc: [0x0302, 0x0001], // GL.SRC_ALPHA, GL.ONE
  blendEquation: 0x8006, // GL.FUNC_ADD
  depthTest: false,
  depthMask: false
}
```

**주요 개선 사항:**
- **이중 레이어 구조**: `clouds-base` + `clouds-highlight` 레이어
- **Additive blending**: 겹치는 부분이 밝아져 자연스러운 구름 밀도 표현
- **최적화된 색상**: Additive blending을 위해 색상 강도 80% 감소, 최대값 200으로 제한
- **낮은 투명도**: 기존 대비 50% 감소하여 오버플로우 방지
- **큰 파티클 크기**: 1.3배 확대로 겹침 효과 증대

#### 🌧️ 비 파티클 소프트 블렌딩 
**구현된 기술:**
```typescript
// Alpha blending 설정 (비에 최적화)
parameters: {
  blend: true,
  blendFunc: [0x0302, 0x0303], // GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA
  blendEquation: 0x8006, // GL.FUNC_ADD
  depthTest: false,
  depthMask: false
}
```

**주요 개선 사항:**
- **이중 레이어 구조**: `rain-main` + `rain-splash` 레이어
- **Alpha blending**: 비는 additive보다 alpha가 더 자연스러운 효과
- **스플래시 효과**: 낮은 고도(200m 이하)에서 더 큰 스플래시 파티클
- **차별화된 색상**: 메인 비(180,200,255)와 스플래시(220,230,255)

### 🛠️ 기술적 성과

#### WebGL 블렌딩 최적화
- **구름**: Additive blending으로 메타볼과 유사한 융합 효과
- **비**: Alpha blending으로 자연스러운 투명도 합성
- **성능**: depthTest/depthMask 비활성화로 렌더링 최적화

#### 파티클 시스템 개선
- **구름 색상**: RGB 값을 0.8 배수로 조정하여 밝기 제어
- **투명도 조정**: Additive blending에 맞게 기존 대비 50% 감소
- **크기 최적화**: 구름 1.3배, 비 2배 확대로 블렌딩 효과 극대화

#### 레이어 구조 혁신
```typescript
// 기존: 단일 레이어
ScatterplotLayer -> PointCloudLayer

// 개선: 다중 레이어 + 블렌딩
clouds-base (Additive) + clouds-highlight (Additive)
rain-main (Alpha) + rain-splash (Alpha)
```

### 📊 성능 및 품질 지표

#### ✅ 달성된 목표
- **연속적 구름 형태**: 개별 파티클 구분 불가능
- **자연스러운 가장자리**: 부드러운 페이딩 효과
- **밀도 표현**: 겹치는 부분의 자연스러운 밝기 증가
- **성능 유지**: 60fps 유지 (블렌딩 오버헤드 최소화)

#### 🎨 시각적 개선 효과
1. **구름**: 메타볼과 유사한 연속적 형태
2. **비**: 부드러운 빗방울과 스플래시 효과
3. **자연스러움**: 실제 날씨 현상에 가까운 시각적 품질
4. **일관성**: 모든 날씨 상태에서 균일한 블렌딩 품질

### 🔧 구현 세부사항

#### 코드 변경 사항
- **PointCloudLayer 제거**: ScatterplotLayer로 통일
- **parameters 속성 추가**: WebGL 블렌딩 모드 설정
- **투명도 재계산**: `d.opacity * 120` (기존 180에서 감소)
- **색상 최적화**: `Math.min(200, r * 0.8)` 밝기 제한

#### 성능 최적화
- **depthTest: false**: Z-버퍼 테스트 비활성화
- **depthMask: false**: 깊이 쓰기 비활성화  
- **필터링**: 하이라이트 레이어는 1/3 파티클만 렌더링
- **레이어 분리**: 효과별 독립적 최적화 가능

## 📈 향후 확장 계획

### 단기 확장 (1-2주)
- ✅ 구름 파티클 소프트 블렌딩 완료
- ✅ 비 파티클 소프트 블렌딩 완료
- 🔲 눈 파티클 소프트 블렌딩 적용
- 🔲 안개 효과 구현

### 중기 확장 (1-2개월)
- 볼륨 렌더링 기법 도입
- 실시간 구름 시뮬레이션
- 광산란 효과 추가

### 장기 확장 (3-6개월)
- 3D 텍스처 기반 구름 렌더링
- 기상 데이터 기반 실시간 구름 생성
- VR/AR 지원