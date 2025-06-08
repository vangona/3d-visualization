// 간단한 3D 건물 레이어 (GeoJsonLayer 사용)

import { GeoJsonLayer } from '@deck.gl/layers';
import { WeatherStation } from '@/types/weather';
import type { Feature, FeatureCollection, Polygon } from 'geojson';

// 건물 properties 타입 정의
interface BuildingProperties {
  name: string;
  height: number;
}

// 서울의 주요 건물들 샘플 데이터
const SAMPLE_BUILDINGS: FeatureCollection<Polygon, BuildingProperties> = {
  type: "FeatureCollection",
  features: [
    // 랜드마크 타워들
    {
      type: "Feature",
      properties: { name: "롯데월드타워", height: 554 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.1026, 37.5125],
          [127.1030, 37.5125],
          [127.1030, 37.5129],
          [127.1026, 37.5129],
          [127.1026, 37.5125]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "63빌딩", height: 249 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9360, 37.5185],
          [126.9370, 37.5185],
          [126.9370, 37.5195],
          [126.9360, 37.5195],
          [126.9360, 37.5185]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "남산타워", height: 236 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9880, 37.5512],
          [126.9890, 37.5512],
          [126.9890, 37.5522],
          [126.9880, 37.5522],
          [126.9880, 37.5512]
        ]]
      }
    },

    // 중구
    {
      type: "Feature", 
      properties: { name: "서울시청", height: 120 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9770, 37.5655],
          [126.9780, 37.5655],
          [126.9780, 37.5665],
          [126.9770, 37.5665],
          [126.9770, 37.5655]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "명동 롯데백화점", height: 200 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9810, 37.5648],
          [126.9820, 37.5648],
          [126.9820, 37.5658],
          [126.9810, 37.5658],
          [126.9810, 37.5648]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "동대문 DDP", height: 85 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0080, 37.5665],
          [127.0090, 37.5665],
          [127.0090, 37.5675],
          [127.0080, 37.5675],
          [127.0080, 37.5665]
        ]]
      }
    },

    // 종로구
    {
      type: "Feature",
      properties: { name: "경복궁", height: 25 },
      geometry: {
        type: "Polygon", 
        coordinates: [[
          [126.9740, 37.5780],
          [126.9790, 37.5780],
          [126.9790, 37.5820],
          [126.9740, 37.5820],
          [126.9740, 37.5780]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "종로타워", height: 135 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9830, 37.5700],
          [126.9840, 37.5700],
          [126.9840, 37.5710],
          [126.9830, 37.5710],
          [126.9830, 37.5700]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "광화문 교보빌딩", height: 165 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9760, 37.5705],
          [126.9770, 37.5705],
          [126.9770, 37.5715],
          [126.9760, 37.5715],
          [126.9760, 37.5705]
        ]]
      }
    },

    // 강남구
    {
      type: "Feature",
      properties: { name: "강남역 교보타워", height: 180 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0270, 37.4975],
          [127.0280, 37.4975],
          [127.0280, 37.4985],
          [127.0270, 37.4985],
          [127.0270, 37.4975]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "테헤란로 빌딩A", height: 220 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0290, 37.4970],
          [127.0300, 37.4970],
          [127.0300, 37.4980],
          [127.0290, 37.4980],
          [127.0290, 37.4970]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "삼성동 무역센터", height: 280 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0590, 37.5130],
          [127.0600, 37.5130],
          [127.0600, 37.5140],
          [127.0590, 37.5140],
          [127.0590, 37.5130]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "코엑스", height: 120 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0580, 37.5115],
          [127.0590, 37.5115],
          [127.0590, 37.5125],
          [127.0580, 37.5125],
          [127.0580, 37.5115]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "역삼동 포스코센터", height: 233 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0360, 37.4990],
          [127.0370, 37.4990],
          [127.0370, 37.5000],
          [127.0360, 37.5000],
          [127.0360, 37.4990]
        ]]
      }
    },

    // 서초구
    {
      type: "Feature",
      properties: { name: "서초동 교보타워", height: 195 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0230, 37.4890],
          [127.0240, 37.4890],
          [127.0240, 37.4900],
          [127.0230, 37.4900],
          [127.0230, 37.4890]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "서초구청", height: 85 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0320, 37.4835],
          [127.0330, 37.4835],
          [127.0330, 37.4845],
          [127.0320, 37.4845],
          [127.0320, 37.4835]
        ]]
      }
    },

    // 송파구
    {
      type: "Feature",
      properties: { name: "잠실 롯데캐슬", height: 260 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0950, 37.5140],
          [127.0960, 37.5140],
          [127.0960, 37.5150],
          [127.0950, 37.5150],
          [127.0950, 37.5140]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "올림픽공원 근처 아파트", height: 150 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.1220, 37.5190],
          [127.1230, 37.5190],
          [127.1230, 37.5200],
          [127.1220, 37.5200],
          [127.1220, 37.5190]
        ]]
      }
    },

    // 강동구
    {
      type: "Feature",
      properties: { name: "천호동 아파트단지", height: 140 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.1240, 37.5380],
          [127.1250, 37.5380],
          [127.1250, 37.5390],
          [127.1240, 37.5390],
          [127.1240, 37.5380]
        ]]
      }
    },

    // 강북구
    {
      type: "Feature",
      properties: { name: "미아동 주상복합", height: 120 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0250, 37.6120],
          [127.0260, 37.6120],
          [127.0260, 37.6130],
          [127.0250, 37.6130],
          [127.0250, 37.6120]
        ]]
      }
    },

    // 성북구
    {
      type: "Feature",
      properties: { name: "성신여대 앞 빌딩", height: 95 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0170, 37.5930],
          [127.0180, 37.5930],
          [127.0180, 37.5940],
          [127.0170, 37.5940],
          [127.0170, 37.5930]
        ]]
      }
    },

    // 동대문구
    {
      type: "Feature",
      properties: { name: "청량리 롯데백화점", height: 110 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0470, 37.5800],
          [127.0480, 37.5800],
          [127.0480, 37.5810],
          [127.0470, 37.5810],
          [127.0470, 37.5800]
        ]]
      }
    },

    // 마포구
    {
      type: "Feature",
      properties: { name: "홍대 상상마당", height: 80 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9220, 37.5560],
          [126.9230, 37.5560],
          [126.9230, 37.5570],
          [126.9220, 37.5570],
          [126.9220, 37.5560]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "마포구청", height: 65 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9020, 37.5660],
          [126.9030, 37.5660],
          [126.9030, 37.5670],
          [126.9020, 37.5670],
          [126.9020, 37.5660]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "합정동 복합빌딩", height: 130 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9130, 37.5490],
          [126.9140, 37.5490],
          [126.9140, 37.5500],
          [126.9130, 37.5500],
          [126.9130, 37.5490]
        ]]
      }
    },

    // 서대문구
    {
      type: "Feature",
      properties: { name: "신촌 현대백화점", height: 140 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9360, 37.5560],
          [126.9370, 37.5560],
          [126.9370, 37.5570],
          [126.9360, 37.5570],
          [126.9360, 37.5560]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "연세대 앞 상가", height: 75 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9350, 37.5580],
          [126.9360, 37.5580],
          [126.9360, 37.5590],
          [126.9350, 37.5590],
          [126.9350, 37.5580]
        ]]
      }
    },

    // 은평구
    {
      type: "Feature",
      properties: { name: "불광동 주상복합", height: 110 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9290, 37.6100],
          [126.9300, 37.6100],
          [126.9300, 37.6110],
          [126.9290, 37.6110],
          [126.9290, 37.6100]
        ]]
      }
    },

    // 용산구
    {
      type: "Feature",
      properties: { name: "용산역 I'PARK몰", height: 145 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9650, 37.5300],
          [126.9660, 37.5300],
          [126.9660, 37.5310],
          [126.9650, 37.5310],
          [126.9650, 37.5300]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "이태원 해밀톤호텔", height: 90 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9940, 37.5340],
          [126.9950, 37.5340],
          [126.9950, 37.5350],
          [126.9940, 37.5350],
          [126.9940, 37.5340]
        ]]
      }
    },

    // 여의도 (영등포구)
    {
      type: "Feature",
      properties: { name: "여의도 IFC", height: 300 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9240, 37.5200],
          [126.9250, 37.5200],
          [126.9250, 37.5210],
          [126.9240, 37.5210],
          [126.9240, 37.5200]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "여의도 LG트윈타워", height: 250 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9260, 37.5190],
          [126.9270, 37.5190],
          [126.9270, 37.5200],
          [126.9260, 37.5200],
          [126.9260, 37.5190]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "여의도 KBS", height: 120 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9240, 37.5260],
          [126.9250, 37.5260],
          [126.9250, 37.5270],
          [126.9240, 37.5270],
          [126.9240, 37.5260]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "영등포구청", height: 85 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.8960, 37.5150],
          [126.8970, 37.5150],
          [126.8970, 37.5160],
          [126.8960, 37.5160],
          [126.8960, 37.5150]
        ]]
      }
    },

    // 동작구
    {
      type: "Feature",
      properties: { name: "노량진 수산시장", height: 45 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9420, 37.5140],
          [126.9430, 37.5140],
          [126.9430, 37.5150],
          [126.9420, 37.5150],
          [126.9420, 37.5140]
        ]]
      }
    },

    // 관악구
    {
      type: "Feature",
      properties: { name: "서울대입구역 타워", height: 160 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9520, 37.4810],
          [126.9530, 37.4810],
          [126.9530, 37.4820],
          [126.9520, 37.4820],
          [126.9520, 37.4810]
        ]]
      }
    },

    // 강서구
    {
      type: "Feature",
      properties: { name: "김포공항 터미널", height: 95 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.8010, 37.5580],
          [126.8020, 37.5580],
          [126.8020, 37.5590],
          [126.8010, 37.5590],
          [126.8010, 37.5580]
        ]]
      }
    },

    // 양천구
    {
      type: "Feature",
      properties: { name: "목동 하이페리온", height: 200 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.8750, 37.5260],
          [126.8760, 37.5260],
          [126.8760, 37.5270],
          [126.8750, 37.5270],
          [126.8750, 37.5260]
        ]]
      }
    },

    // 구로구
    {
      type: "Feature",
      properties: { name: "구로디지털단지", height: 135 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9010, 37.4850],
          [126.9020, 37.4850],
          [126.9020, 37.4860],
          [126.9010, 37.4860],
          [126.9010, 37.4850]
        ]]
      }
    },

    // 금천구
    {
      type: "Feature",
      properties: { name: "가산디지털단지", height: 155 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.8820, 37.4800],
          [126.8830, 37.4800],
          [126.8830, 37.4810],
          [126.8820, 37.4810],
          [126.8820, 37.4800]
        ]]
      }
    },

    // 성동구
    {
      type: "Feature",
      properties: { name: "왕십리 빌딩", height: 125 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0370, 37.5610],
          [127.0380, 37.5610],
          [127.0380, 37.5620],
          [127.0370, 37.5620],
          [127.0370, 37.5610]
        ]]
      }
    },

    // 광진구
    {
      type: "Feature",
      properties: { name: "건대입구 스타시티", height: 175 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0700, 37.5400],
          [127.0710, 37.5400],
          [127.0710, 37.5410],
          [127.0700, 37.5410],
          [127.0700, 37.5400]
        ]]
      }
    },

    // 중랑구
    {
      type: "Feature",
      properties: { name: "중랑구청", height: 70 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0920, 37.6060],
          [127.0930, 37.6060],
          [127.0930, 37.6070],
          [127.0920, 37.6070],
          [127.0920, 37.6060]
        ]]
      }
    },

    // 노원구
    {
      type: "Feature",
      properties: { name: "노원구청", height: 85 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0570, 37.6540],
          [127.0580, 37.6540],
          [127.0580, 37.6550],
          [127.0570, 37.6550],
          [127.0570, 37.6540]
        ]]
      }
    },

    // 도봉구
    {
      type: "Feature",
      properties: { name: "도봉구청", height: 75 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0470, 37.6680],
          [127.0480, 37.6680],
          [127.0480, 37.6690],
          [127.0470, 37.6690],
          [127.0470, 37.6680]
        ]]
      }
    },

    // 강남구 추가 빌딩들 (테헤란로 일대)
    {
      type: "Feature",
      properties: { name: "테헤란로 빌딩B", height: 195 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0310, 37.4995],
          [127.0320, 37.4995],
          [127.0320, 37.5005],
          [127.0310, 37.5005],
          [127.0310, 37.4995]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "테헤란로 빌딩C", height: 210 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0330, 37.4985],
          [127.0340, 37.4985],
          [127.0340, 37.4995],
          [127.0330, 37.4995],
          [127.0330, 37.4985]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "역삼동 오피스텔A", height: 150 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0340, 37.5010],
          [127.0350, 37.5010],
          [127.0350, 37.5020],
          [127.0340, 37.5020],
          [127.0340, 37.5010]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "역삼동 오피스텔B", height: 165 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0320, 37.5015],
          [127.0330, 37.5015],
          [127.0330, 37.5025],
          [127.0320, 37.5025],
          [127.0320, 37.5015]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "삼성동 아파트A", height: 180 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0610, 37.5105],
          [127.0620, 37.5105],
          [127.0620, 37.5115],
          [127.0610, 37.5115],
          [127.0610, 37.5105]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "삼성동 아파트B", height: 175 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0570, 37.5150],
          [127.0580, 37.5150],
          [127.0580, 37.5160],
          [127.0570, 37.5160],
          [127.0570, 37.5150]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "논현동 상가A", height: 85 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0220, 37.5100],
          [127.0230, 37.5100],
          [127.0230, 37.5110],
          [127.0220, 37.5110],
          [127.0220, 37.5100]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "논현동 상가B", height: 95 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0240, 37.5110],
          [127.0250, 37.5110],
          [127.0250, 37.5120],
          [127.0240, 37.5120],
          [127.0240, 37.5110]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "도곡동 아파트A", height: 140 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0480, 37.4900],
          [127.0490, 37.4900],
          [127.0490, 37.4910],
          [127.0480, 37.4910],
          [127.0480, 37.4900]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "도곡동 아파트B", height: 155 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0500, 37.4890],
          [127.0510, 37.4890],
          [127.0510, 37.4900],
          [127.0500, 37.4900],
          [127.0500, 37.4890]
        ]]
      }
    },

    // 서초구 추가 빌딩들
    {
      type: "Feature",
      properties: { name: "서초동 아파트A", height: 160 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0250, 37.4920],
          [127.0260, 37.4920],
          [127.0260, 37.4930],
          [127.0250, 37.4930],
          [127.0250, 37.4920]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "서초동 아파트B", height: 145 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0270, 37.4910],
          [127.0280, 37.4910],
          [127.0280, 37.4920],
          [127.0270, 37.4920],
          [127.0270, 37.4910]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "반포동 아파트A", height: 190 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0120, 37.5050],
          [127.0130, 37.5050],
          [127.0130, 37.5060],
          [127.0120, 37.5060],
          [127.0120, 37.5050]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "반포동 아파트B", height: 185 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0140, 37.5040],
          [127.0150, 37.5040],
          [127.0150, 37.5050],
          [127.0140, 37.5050],
          [127.0140, 37.5040]
        ]]
      }
    },

    // 송파구 추가 빌딩들
    {
      type: "Feature",
      properties: { name: "잠실동 아파트A", height: 170 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0970, 37.5130],
          [127.0980, 37.5130],
          [127.0980, 37.5140],
          [127.0970, 37.5140],
          [127.0970, 37.5130]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "잠실동 아파트B", height: 165 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0990, 37.5120],
          [127.1000, 37.5120],
          [127.1000, 37.5130],
          [127.0990, 37.5130],
          [127.0990, 37.5120]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "문정동 아파트A", height: 130 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.1220, 37.4850],
          [127.1230, 37.4850],
          [127.1230, 37.4860],
          [127.1220, 37.4860],
          [127.1220, 37.4850]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "문정동 아파트B", height: 125 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.1240, 37.4840],
          [127.1250, 37.4840],
          [127.1250, 37.4850],
          [127.1240, 37.4850],
          [127.1240, 37.4840]
        ]]
      }
    },

    // 마포구 추가 빌딩들
    {
      type: "Feature",
      properties: { name: "홍대 상가A", height: 65 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9210, 37.5550],
          [126.9220, 37.5550],
          [126.9220, 37.5560],
          [126.9210, 37.5560],
          [126.9210, 37.5550]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "홍대 상가B", height: 70 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9240, 37.5540],
          [126.9250, 37.5540],
          [126.9250, 37.5550],
          [126.9240, 37.5550],
          [126.9240, 37.5540]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "상암동 빌딩A", height: 120 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.8890, 37.5780],
          [126.8900, 37.5780],
          [126.8900, 37.5790],
          [126.8890, 37.5790],
          [126.8890, 37.5780]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "상암동 빌딩B", height: 110 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.8910, 37.5770],
          [126.8920, 37.5770],
          [126.8920, 37.5780],
          [126.8910, 37.5780],
          [126.8910, 37.5770]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "연남동 아파트A", height: 100 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9180, 37.5620],
          [126.9190, 37.5620],
          [126.9190, 37.5630],
          [126.9180, 37.5630],
          [126.9180, 37.5620]
        ]]
      }
    },

    // 영등포구 추가 빌딩들
    {
      type: "Feature",
      properties: { name: "여의도 빌딩A", height: 220 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9280, 37.5180],
          [126.9290, 37.5180],
          [126.9290, 37.5190],
          [126.9280, 37.5190],
          [126.9280, 37.5180]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "여의도 빌딩B", height: 235 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9300, 37.5170],
          [126.9310, 37.5170],
          [126.9310, 37.5180],
          [126.9300, 37.5180],
          [126.9300, 37.5170]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "영등포동 아파트A", height: 135 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9050, 37.5180],
          [126.9060, 37.5180],
          [126.9060, 37.5190],
          [126.9050, 37.5190],
          [126.9050, 37.5180]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "영등포동 아파트B", height: 140 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9070, 37.5170],
          [126.9080, 37.5170],
          [126.9080, 37.5180],
          [126.9070, 37.5180],
          [126.9070, 37.5170]
        ]]
      }
    },

    // 종로구 추가 빌딩들
    {
      type: "Feature",
      properties: { name: "종로 상가A", height: 80 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9850, 37.5690],
          [126.9860, 37.5690],
          [126.9860, 37.5700],
          [126.9850, 37.5700],
          [126.9850, 37.5690]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "종로 상가B", height: 85 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9870, 37.5680],
          [126.9880, 37.5680],
          [126.9880, 37.5690],
          [126.9870, 37.5690],
          [126.9870, 37.5680]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "평창동 아파트A", height: 110 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9680, 37.6050],
          [126.9690, 37.6050],
          [126.9690, 37.6060],
          [126.9680, 37.6060],
          [126.9680, 37.6050]
        ]]
      }
    },

    // 용산구 추가 빌딩들
    {
      type: "Feature",
      properties: { name: "한남동 아파트A", height: 170 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0070, 37.5340],
          [127.0080, 37.5340],
          [127.0080, 37.5350],
          [127.0070, 37.5350],
          [127.0070, 37.5340]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "한남동 아파트B", height: 165 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0090, 37.5330],
          [127.0100, 37.5330],
          [127.0100, 37.5340],
          [127.0090, 37.5340],
          [127.0090, 37.5330]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "용산 상가A", height: 90 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9670, 37.5290],
          [126.9680, 37.5290],
          [126.9680, 37.5300],
          [126.9670, 37.5300],
          [126.9670, 37.5290]
        ]]
      }
    },

    // 중구 추가 빌딩들
    {
      type: "Feature",
      properties: { name: "명동 상가A", height: 75 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9830, 37.5630],
          [126.9840, 37.5630],
          [126.9840, 37.5640],
          [126.9830, 37.5640],
          [126.9830, 37.5630]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "명동 상가B", height: 80 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9850, 37.5620],
          [126.9860, 37.5620],
          [126.9860, 37.5630],
          [126.9850, 37.5630],
          [126.9850, 37.5620]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "을지로 빌딩A", height: 105 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9910, 37.5650],
          [126.9920, 37.5650],
          [126.9920, 37.5660],
          [126.9910, 37.5660],
          [126.9910, 37.5650]
        ]]
      }
    },

    // 서대문구 추가 빌딩들
    {
      type: "Feature",
      properties: { name: "신촌 상가A", height: 70 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9340, 37.5540],
          [126.9350, 37.5540],
          [126.9350, 37.5550],
          [126.9340, 37.5550],
          [126.9340, 37.5540]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "연희동 아파트A", height: 120 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9260, 37.5710],
          [126.9270, 37.5710],
          [126.9270, 37.5720],
          [126.9260, 37.5720],
          [126.9260, 37.5710]
        ]]
      }
    },

    // 강서구 추가 빌딩들
    {
      type: "Feature",
      properties: { name: "화곡동 아파트A", height: 115 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.8430, 37.5420],
          [126.8440, 37.5420],
          [126.8440, 37.5430],
          [126.8430, 37.5430],
          [126.8430, 37.5420]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "발산동 아파트A", height: 125 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.8380, 37.5590],
          [126.8390, 37.5590],
          [126.8390, 37.5600],
          [126.8380, 37.5600],
          [126.8380, 37.5590]
        ]]
      }
    },

    // 양천구 추가 빌딩들
    {
      type: "Feature",
      properties: { name: "목동 아파트A", height: 160 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.8770, 37.5250],
          [126.8780, 37.5250],
          [126.8780, 37.5260],
          [126.8770, 37.5260],
          [126.8770, 37.5250]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "목동 아파트B", height: 155 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.8790, 37.5240],
          [126.8800, 37.5240],
          [126.8800, 37.5250],
          [126.8790, 37.5250],
          [126.8790, 37.5240]
        ]]
      }
    },

    // 강동구 추가 빌딩들
    {
      type: "Feature",
      properties: { name: "천호동 아파트B", height: 135 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.1260, 37.5370],
          [127.1270, 37.5370],
          [127.1270, 37.5380],
          [127.1260, 37.5380],
          [127.1260, 37.5370]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "강일동 아파트A", height: 120 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.1750, 37.5560],
          [127.1760, 37.5560],
          [127.1760, 37.5570],
          [127.1750, 37.5570],
          [127.1750, 37.5560]
        ]]
      }
    },

    // 성동구 추가 빌딩들
    {
      type: "Feature",
      properties: { name: "성수동 빌딩A", height: 105 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0550, 37.5440],
          [127.0560, 37.5440],
          [127.0560, 37.5450],
          [127.0550, 37.5450],
          [127.0550, 37.5440]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "성수동 빌딩B", height: 110 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0570, 37.5430],
          [127.0580, 37.5430],
          [127.0580, 37.5440],
          [127.0570, 37.5440],
          [127.0570, 37.5430]
        ]]
      }
    },

    // 광진구 추가 빌딩들
    {
      type: "Feature",
      properties: { name: "자양동 아파트A", height: 130 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0720, 37.5300],
          [127.0730, 37.5300],
          [127.0730, 37.5310],
          [127.0720, 37.5310],
          [127.0720, 37.5300]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "구의동 아파트A", height: 125 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0850, 37.5380],
          [127.0860, 37.5380],
          [127.0860, 37.5390],
          [127.0850, 37.5390],
          [127.0850, 37.5380]
        ]]
      }
    },

    // 은평구 추가 빌딩들
    {
      type: "Feature",
      properties: { name: "응암동 아파트A", height: 105 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9190, 37.6020],
          [126.9200, 37.6020],
          [126.9200, 37.6030],
          [126.9190, 37.6030],
          [126.9190, 37.6020]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "은평뉴타운A", height: 140 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9270, 37.6180],
          [126.9280, 37.6180],
          [126.9280, 37.6190],
          [126.9270, 37.6190],
          [126.9270, 37.6180]
        ]]
      }
    },

    // 노원구 추가 빌딩들
    {
      type: "Feature",
      properties: { name: "중계동 아파트A", height: 150 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0720, 37.6510],
          [127.0730, 37.6510],
          [127.0730, 37.6520],
          [127.0720, 37.6520],
          [127.0720, 37.6510]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "상계동 아파트A", height: 145 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [127.0650, 37.6650],
          [127.0660, 37.6650],
          [127.0660, 37.6660],
          [127.0650, 37.6660],
          [127.0650, 37.6650]
        ]]
      }
    },

    // 동작구 추가 빌딩들
    {
      type: "Feature",
      properties: { name: "사당동 아파트A", height: 120 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9810, 37.4760],
          [126.9820, 37.4760],
          [126.9820, 37.4770],
          [126.9810, 37.4770],
          [126.9810, 37.4760]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "흑석동 아파트A", height: 115 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9570, 37.5050],
          [126.9580, 37.5050],
          [126.9580, 37.5060],
          [126.9570, 37.5060],
          [126.9570, 37.5050]
        ]]
      }
    },

    // 관악구 추가 빌딩들
    {
      type: "Feature",
      properties: { name: "봉천동 아파트A", height: 110 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9450, 37.4810],
          [126.9460, 37.4810],
          [126.9460, 37.4820],
          [126.9450, 37.4820],
          [126.9450, 37.4810]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "신림동 아파트A", height: 105 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [126.9290, 37.4640],
          [126.9300, 37.4640],
          [126.9300, 37.4650],
          [126.9290, 37.4650],
          [126.9290, 37.4640]
        ]]
      }
    }
  ]
};

// 간단한 3D 건물 레이어 생성
export const createSimple3DBuildingLayer = (
  weatherStations: WeatherStation[],
  zoom: number
) => {
  if (zoom < 13) return null; // 줌 13부터 표시

  return new GeoJsonLayer({
    id: 'simple-buildings-3d',
    data: SAMPLE_BUILDINGS,
    
    // 3D 설정
    pickable: true,
    stroked: true,
    filled: true,
    extruded: true,
    wireframe: false,
    
    // 건물 높이
    getElevation: (d) => {
      const feature = d as Feature<Polygon, BuildingProperties>;
      return feature.properties.height || 50;
    },
    
    // 건물 색상 (날씨 기반)
    getFillColor: (d) => {
      const feature = d as Feature<Polygon, BuildingProperties>;
      // 건물 중심점 계산
      const coords = feature.geometry.coordinates[0];
      let lon = 0, lat = 0;
      for (const point of coords) {
        lon += point[0];
        lat += point[1];
      }
      lon /= coords.length;
      lat /= coords.length;
      
      // 가장 가까운 날씨 관측소 찾기
      let minDistance = Infinity;
      let nearestStation = weatherStations[0];
      
      for (const station of weatherStations) {
        const distance = Math.sqrt(
          Math.pow(lon - station.location.longitude, 2) + 
          Math.pow(lat - station.location.latitude, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestStation = station;
        }
      }
      
      // 날씨에 따른 색상
      if (!nearestStation) return [200, 200, 200, 180];
      
      const precipitation = nearestStation.weather.precipitation;
      if (precipitation > 20) return [100, 150, 255, 200]; // 폭우 - 진한 파랑
      if (precipitation > 10) return [150, 180, 255, 200]; // 비 - 파랑
      if (precipitation > 1) return [200, 220, 255, 200];  // 약한 비 - 연한 파랑
      if (nearestStation.weather.cloudCoverage > 50) return [180, 180, 190, 200]; // 흐림 - 회색
      return [255, 220, 150, 200]; // 맑음 - 노랑
    },
    
    // 건물 테두리
    getLineColor: [80, 80, 80, 255],
    getLineWidth: 2,
    lineWidthMinPixels: 1,
    lineWidthMaxPixels: 3,
    
    // 3D 렌더링 설정  
    opacity: 0.9,
    
    // 머티리얼
    material: {
      ambient: 0.6,
      diffuse: 0.8,
      shininess: 32,
      specularColor: [255, 255, 255]
    },
    
    // 성능 최적화
    updateTriggers: {
      getFillColor: [weatherStations]
    }
  });
};