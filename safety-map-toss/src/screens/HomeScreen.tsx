import { useRef, useState } from 'react';
import { useAddressSearch } from '../hooks/useAddressSearch';
import { JusoItem } from '../services/addressService';
import BannerAdComponent from './BannerAdComponent';
import { geocodeAddress } from '../services/geocodingService';

interface LocationItem {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

const REGION_GROUPS = [
  {
    label: '서울·경기·인천',
    locations: [
      { id: 'gangnam', label: '서울 강남구', lat: 37.4979, lng: 127.0276 },
      { id: 'itaewon', label: '서울 이태원', lat: 37.5345, lng: 126.9940 },
      { id: 'bupyeong', label: '인천 부평', lat: 37.4894, lng: 126.7224 },
      { id: 'incheon_dong', label: '인천 동인천', lat: 37.4739, lng: 126.6314 },
      { id: 'bucheon', label: '부천 원미구', lat: 37.4843, lng: 126.7827 },
      { id: 'suwon_paldal', label: '수원 팔달구', lat: 37.2636, lng: 127.0286 },
      { id: 'ansan_danwon', label: '안산 단원구', lat: 37.3219, lng: 126.8309 },
      { id: 'uijeongbu', label: '의정부 가능동', lat: 37.7381, lng: 127.0472 },
    ],
  },
  {
    label: '충청',
    locations: [
      { id: 'daejeon_eunhaeng', label: '대전 은행동', lat: 36.3270, lng: 127.4273 },
      { id: 'daejeon_daedeok', label: '대전 대덕구', lat: 36.3463, lng: 127.4149 },
      { id: 'cheongju_sangdang', label: '청주 성안동', lat: 36.6372, lng: 127.4897 },
      { id: 'cheongju_heungdeok', label: '청주 흥덕구', lat: 36.6424, lng: 127.4553 },
    ],
  },
  {
    label: '경상',
    locations: [
      { id: 'busan_seomyeon', label: '부산 서면', lat: 35.1579, lng: 129.0597 },
      { id: 'busan_haeundae', label: '부산 해운대', lat: 35.1631, lng: 129.1635 },
      { id: 'daegu_dongseong', label: '대구 동성로', lat: 35.8694, lng: 128.5966 },
      { id: 'daegu_chilsung', label: '대구 칠성시장', lat: 35.8823, lng: 128.5972 },
      { id: 'ulsan_namgu', label: '울산 남구 삼산', lat: 35.5384, lng: 129.3114 },
      { id: 'ulsan_junggu', label: '울산 중구 성남동', lat: 35.5689, lng: 129.3320 },
      { id: 'masan_odong', label: '마산 오동동', lat: 35.1833, lng: 128.5742 },
      { id: 'changwon_sangnam', label: '창원 상남동', lat: 35.2279, lng: 128.6811 },
      { id: 'gimhae_naeoe', label: '김해 내외동', lat: 35.2340, lng: 128.8811 },
      { id: 'gimhae_jangyu', label: '김해 장유', lat: 35.1690, lng: 128.7630 },
    ],
  },
  {
    label: '전라·제주',
    locations: [
      { id: 'gwangju_sangmu', label: '광주 상무지구', lat: 35.1517, lng: 126.8496 },
      { id: 'gwangju_chumdan', label: '광주 첨단', lat: 35.2162, lng: 126.8462 },
      { id: 'gwangju_chungjang', label: '광주 충장로', lat: 35.1468, lng: 126.9154 },
      { id: 'jeonju_gaeksa', label: '전주 객사·풍남동', lat: 35.8153, lng: 127.1134 },
      { id: 'jeonju_deokjin', label: '전주 덕진구', lat: 35.8374, lng: 127.1298 },
      { id: 'jeju_city', label: '제주 연동', lat: 33.4996, lng: 126.5312 },
      { id: 'jeju_seogwipo', label: '서귀포 중앙동', lat: 33.2541, lng: 126.5600 },
    ],
  },
  
];

interface HomeScreenProps {
  onSearchComplete: (location: { lat: number; lng: number }, address: string) => void;
  initialAddress?: string | null;  // ← 추가
  initialCoord?: { lat: number; lng: number } | null; // ← 추가
}

export default function HomeScreen({
  onSearchComplete,
  initialAddress,
  initialCoord,
}: HomeScreenProps) {
  const [searchQuery, setSearchQuery] = useState(initialAddress ?? '');
  const [activeCoordinate, setActiveCoordinate] = useState<{ lat: number; lng: number } | null>(
    initialCoord ?? null
  );

  // 현재 어떤 방식으로 위치가 선택되었는지 추적 ('CHIP' | 'CURRENT' | 'CUSTOM')
  const [searchType, setSearchType] = useState<'CHIP' | 'CURRENT' | 'CUSTOM'>(
    initialAddress ? 'CUSTOM' : 'CUSTOM'
  );

  // 💡 사용자가 검색 결과 리스트에서 주소를 "선택"했는지 여부 (선택 전까지는 드롭다운을 보여줌)
  const [isAddressConfirmed, setIsAddressConfirmed] = useState(!!initialAddress); // ← 딥링크면 바로 확정
  const searchInputRef = useRef<HTMLInputElement>(null);
  // 💡 주소 검색 훅 연결 — CUSTOM 모드 + 아직 확정 안 했을 때만 검색 실행
  const { results, loading, error } = useAddressSearch(
    searchType === 'CUSTOM' && !isAddressConfirmed ? searchQuery : ''
  );

  const [selectedChipId, setSelectedChipId] = useState<string | null>(null);

  // 1. 추천 지역 칩 클릭 -> 해당 칩 이름과 좌표 매핑
  const handleSelectChip = (loc: LocationItem) => {
    setSearchQuery(loc.label);
    setSearchType('CHIP');
    setActiveCoordinate({ lat: loc.lat, lng: loc.lng });
    setIsAddressConfirmed(true);
    setSelectedChipId(loc.id); // ← 추가
  };


  // 2. 현재 위치 클릭 -> 현재 위치 이름과 좌표 매핑
  const handleCurrentLocation = () => {
    setSelectedChipId('current'); // ← 추가 (맨 위에)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setSearchQuery('내 주변 현재 위치');
          setSearchType('CURRENT');
          setActiveCoordinate({ lat: latitude, lng: longitude });
          setIsAddressConfirmed(true);
        },
        () => {
          alert('현재 위치 권한을 확인해주세요.');
          setSearchQuery('광주광역시 (기본값)');
          setSearchType('CURRENT');
          setActiveCoordinate({ lat: 35.1468, lng: 126.8481 });
          setIsAddressConfirmed(true);
        }
      );
    } else {
      alert('위치 서비스를 지원하지 않는 기기입니다.');
    }
  };

  // 3. 인풋창 직접 타이핑 감지 핸들러
  const handleInputChange = (text: string) => {
    setSearchQuery(text);

    // 💡 글자가 입력되거나 지워지면 무조건 '사용자 정의' 모드로 전환
    setSearchType('CUSTOM');
    setActiveCoordinate(null); // 직접 입력 시 기존 칩 좌표 초기화
    setIsAddressConfirmed(false); // 다시 타이핑하면 검색 드롭다운 다시 열림
    setSelectedChipId(null);
  };

  // 💡 검색 결과 리스트에서 주소 하나를 선택했을 때
  const handleSelectAddress = async (item: JusoItem) => {
    setSearchQuery(item.roadAddrPart1);
    setIsAddressConfirmed(true);

    try {
      const coord = await geocodeAddress({
        admCd: item.admCd,
        rnMgtSn: item.rnMgtSn,
        udrtYn: item.udrtYn,
        buldMnnm: item.buldMnnm,
        buldSlno: item.buldSlno,
      });

      if (coord) {
        setActiveCoordinate(coord);
      } else {
        console.warn('좌표 변환 결과 없음:', item.roadAddrPart1);
        setActiveCoordinate(null);
      }
    } catch (e) {
      console.error('Geocoding 실패:', e);
      setActiveCoordinate(null);
    }
  };

  // 4. 하단 최종 분석 버튼 클릭
  const handleMainButtonClick = () => {
    if (!searchQuery.trim()) {
      alert('주소를 입력하거나 아래 추천 지역을 선택해주세요.');
      return;
    }

    if (searchType === 'CUSTOM') {
      console.log(activeCoordinate, searchQuery)
      if (activeCoordinate) {
        onSearchComplete(activeCoordinate, searchQuery);
      } else {
        alert('주소를 목록에서 선택해주세요.');
        return; // ← mock 좌표 대신 그냥 막기
      }
    } else {
      const finalCoord = activeCoordinate || { lat: 35.1468, lng: 126.8481 };
      onSearchComplete(finalCoord, searchQuery);
    }
  };

  // 💡 드롭다운을 보여줄지 여부
  const showDropdown = searchType === 'CUSTOM' && !isAddressConfirmed && searchQuery.trim().length >= 2;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      boxSizing: 'border-box',
      backgroundColor: '#f9fafb',
      fontFamily: '"Pretendard", -apple-system, sans-serif'
    }}>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* 💡 스크롤 영역 — 버튼 높이만큼 하단 패딩 */}
      <div
        className="no-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 20px 100px 20px', // 하단 100px은 고정 버튼 높이 확보
          boxSizing: 'border-box',
        }}
      >
        {/* 타이틀 */}
        <div style={{ marginTop: '24px', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#191f28', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            ⚠️ 내 동네의 범죄 주의 구간을 확인해봐요
          </h1>
          <p style={{ fontSize: '12px', color: '#b0b8c1', margin: 0, lineHeight: '1.5', letterSpacing: '-0.2px' }}>
            경찰청에서 제공하는 '행정구역별 범죄별 밀도분석 공간정보'를 그대로 사용한 데이터입니다. 참고로 활용해보세요!
          </p>
        </div>



      {/* 검색창 */}
      <div style={{ position: 'relative'}}>
        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#8b95a1', fontSize: '18px' }}>
          🔍
        </span>
        <input
          type="text"
          placeholder="당신의 주소를 입력해주세요"
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          ref={searchInputRef}
          style={{
            width: '100%',
            padding: '16px 16px 16px 48px',
            borderRadius: '16px',
            border: 'none',
            margin: '16px 0px',
            backgroundColor: '#f2f4f6',
            fontSize: '16px',
            color: '#191f28',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* 💡 주소 검색 결과 드롭다운 */}
      {showDropdown && (
        <div
          className="no-scrollbar"
          style={{
            position: 'fixed', // ← absolute → fixed
            top: searchInputRef.current
              ? searchInputRef.current.getBoundingClientRect().bottom + 4
              : 0,
            left: 20,
            right: 20,
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxHeight: '240px',
            overflowY: 'auto',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
            zIndex: 50,
          }}
        >
          {loading && (
            <div style={{ padding: '16px', fontSize: '14px', color: '#8b95a1' }}>
              검색 중...
            </div>
          )}

          {!loading && error && (
            <div style={{ padding: '16px', fontSize: '14px', color: '#f04452' }}>
              {error}
            </div>
          )}

          {!loading && !error && results.length === 0 && searchQuery.trim().length >= 2 && (
            <div style={{ padding: '16px', fontSize: '14px', color: '#8b95a1' }}>
              검색 결과가 없습니다.
            </div>
          )}

          {!loading && !error && results.map((item, idx) => (
            <button
              key={`${item.bdMgtSn ?? idx}-${idx}`}
              onClick={() => handleSelectAddress(item)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '14px 16px',
                border: 'none',
                borderBottom: idx !== results.length - 1 ? '1px solid #f2f4f6' : 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '15px', color: '#191f28', fontWeight: 500 }}>
                {item.roadAddrPart1}
              </div>
              <div style={{ fontSize: '13px', color: '#8b95a1', marginTop: '2px' }}>
                {item.jibunAddr}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 현재위치 + 사용자정의 한 줄 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button
          onClick={handleCurrentLocation}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            backgroundColor: selectedChipId === 'current' ? '#0064ff' : '#eef1f4',
            color: selectedChipId === 'current' ? '#ffffff' : '#4e5968',
            border: 'none',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          🌐 현재 위치
        </button>

        {searchType === 'CUSTOM' && searchQuery.trim().length > 0 && (
          <div style={{
            padding: '10px 16px',
            backgroundColor: '#eef1f4',
            color: '#0064ff',
            border: '1px solid #0064ff',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '600',
            flexShrink: 0,
          }}>
            ✏️ 사용자 정의
          </div>
        )}
      </div>

      {/* 지역별 5줄 횡스크롤 */}
      <div
        className="no-scrollbar"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '32px',
        }}
      >
        {REGION_GROUPS.map((group) => (
          <div key={group.label}>
            <p style={{
              fontSize: '11px',
              fontWeight: '600',
              color: '#b0b8c1',
              margin: '0 0 6px 2px',
              letterSpacing: '0.5px',
            }}>
              {group.label}
            </p>
            <div
              className="no-scrollbar"
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {group.locations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => handleSelectChip(loc)}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: selectedChipId === loc.id ? '#0064ff' : '#eef1f4',
                    color: selectedChipId === loc.id ? '#ffffff' : '#4e5968',
                    border: 'none',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {loc.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ width: '100%', minHeight: '250px', marginTop: '16px' }}>
        <BannerAdComponent adGroupId={'ait.v2.live.8d1c445b1d6e44a3'} />
      </div>
    </div>

    {/* 💡 하단 고정 버튼 */}
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '12px 20px 34px', // 34px = 아이폰 홈바 safe area
      backgroundColor: '#f9fafb',
      boxSizing: 'border-box',
    }}>
      <button
        onClick={handleMainButtonClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          padding: '18px',
          backgroundColor: '#0064ff',
          color: '#ffffff',
          border: 'none',
          borderRadius: '48px',
          fontSize: '16px',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0, 100, 255, 0.2)',
          cursor: 'pointer',
        }}
      >
        검색해보기
      </button>
    </div>

  </div>
  )
}