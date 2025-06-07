// 서울시 주요 구 경계 (실제 행정구역에 가까운 간소화된 폴리곤)
export const seoulDistrictBoundaries: Record<string, [number, number][]> = {
  '강남구': [
    [127.0164, 37.5172],
    [127.0474, 37.5294],
    [127.0664, 37.5172],
    [127.0854, 37.5048],
    [127.0664, 37.4872],
    [127.0474, 37.4748],
    [127.0164, 37.4872],
    [127.0054, 37.5048],
    [127.0164, 37.5172],
  ],
  '서초구': [
    [126.9877, 37.4837],
    [127.0027, 37.4937],
    [127.0327, 37.4837],
    [127.0377, 37.4687],
    [127.0327, 37.4537],
    [127.0077, 37.4437],
    [126.9877, 37.4537],
    [126.9827, 37.4687],
    [126.9877, 37.4837],
  ],
  '송파구': [
    [127.0856, 37.5245],
    [127.1056, 37.5345],
    [127.1356, 37.5245],
    [127.1456, 37.5045],
    [127.1356, 37.4845],
    [127.1056, 37.4745],
    [127.0856, 37.4845],
    [127.0756, 37.5045],
    [127.0856, 37.5245],
  ],
  '강서구': [
    [126.8247, 37.5609],
    [126.8347, 37.5709],
    [126.8547, 37.5709],
    [126.8747, 37.5509],
    [126.8747, 37.5309],
    [126.8547, 37.5209],
    [126.8347, 37.5209],
    [126.8247, 37.5409],
    [126.8247, 37.5609],
  ],
  '마포구': [
    [126.8766, 37.5764],
    [126.8966, 37.5864],
    [126.9166, 37.5764],
    [126.9266, 37.5564],
    [126.9166, 37.5364],
    [126.8966, 37.5264],
    [126.8766, 37.5364],
    [126.8666, 37.5564],
    [126.8766, 37.5764],
  ],
  '중구': [
    [126.9730, 37.5736],
    [126.9930, 37.5736],
    [127.0130, 37.5636],
    [127.0230, 37.5436],
    [127.0130, 37.5336],
    [126.9930, 37.5336],
    [126.9730, 37.5436],
    [126.9730, 37.5736],
  ],
  '노원구': [
    [127.0318, 37.6642],
    [127.0518, 37.6742],
    [127.0718, 37.6642],
    [127.0818, 37.6442],
    [127.0718, 37.6242],
    [127.0518, 37.6142],
    [127.0318, 37.6242],
    [127.0218, 37.6442],
    [127.0318, 37.6642],
  ],
  '강동구': [
    [127.0988, 37.5401],
    [127.1188, 37.5401],
    [127.1388, 37.5301],
    [127.1488, 37.5101],
    [127.1388, 37.5001],
    [127.1188, 37.5001],
    [127.0988, 37.5101],
    [127.0888, 37.5301],
    [127.0988, 37.5401],
  ],
};

// 점이 폴리곤 내부에 있는지 확인하는 함수
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

// 구 내부의 랜덤 포인트 생성
export function getRandomPointInDistrict(districtName: string): [number, number] | null {
  const boundary = seoulDistrictBoundaries[districtName];
  if (!boundary) return null;

  // 바운딩 박스 계산
  const lngs = boundary.map(p => p[0]);
  const lats = boundary.map(p => p[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  // 폴리곤 내부의 점을 찾을 때까지 반복
  let attempts = 0;
  while (attempts < 100) {
    const lng = minLng + Math.random() * (maxLng - minLng);
    const lat = minLat + Math.random() * (maxLat - minLat);
    const point: [number, number] = [lng, lat];
    
    if (isPointInPolygon(point, boundary)) {
      return point;
    }
    attempts++;
  }

  // 실패 시 중심점 반환
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
}