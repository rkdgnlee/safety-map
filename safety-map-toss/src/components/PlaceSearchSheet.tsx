// 장소 검색 전체화면 시트. 입력이 없으면 최근 검색 기록을, 입력하면 장소(북한산 등) → 주소 순으로 결과를 보여준다.
import { useEffect, useRef, useState } from 'react';
import type { Place } from '../constants/categories';
import { COLORS, FONT_FAMILY } from '../constants/theme';
import { Close } from './icons';
import { useAddressSearch } from '../hooks/useAddressSearch';
import { usePlaceSearch, type PlaceResult } from '../hooks/usePlaceSearch';
import { preferenceActions, usePreferences } from '../hooks/usePreferences';
import type { JusoItem } from '../services/addressService';
import { geocodeAddress } from '../services/geocodingService';
import { getCurrentPlace } from '../services/locationService';

interface PlaceSearchSheetProps {
  title?: string;
  onSelect: (place: Place) => void;
  onClose: () => void;
}

export default function PlaceSearchSheet({ title = '어디 가세요?', onSelect, onClose }: PlaceSearchSheetProps) {
  const { searchHistory } = usePreferences();
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, loading, error } = useAddressSearch(query);
  const { results: places, loading: placesLoading } = usePlaceSearch(query);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const select = (place: Place, saveHistory: boolean) => {
    if (saveHistory) preferenceActions.addSearchHistory(place);
    onSelect(place);
  };

  const handleSelectAddress = async (item: JusoItem) => {
    setIsResolving(true);
    setMessage(null);
    try {
      const coord = await geocodeAddress({
        admCd: item.admCd,
        rnMgtSn: item.rnMgtSn,
        udrtYn: item.udrtYn,
        buldMnnm: item.buldMnnm,
        buldSlno: item.buldSlno,
      });
      if (!coord) {
        setMessage('이 주소의 위치를 찾지 못했어요. 다른 주소를 골라 주세요.');
        return;
      }
      const label = item.bdNm ? `${item.sggNm} ${item.bdNm}` : `${item.sggNm} ${item.emdNm}`;
      select({ label, ...coord, sido: item.siNm, sigungu: item.sggNm }, true);
    } catch {
      setMessage('위치를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleSelectPlace = (item: PlaceResult) => {
    select({ label: item.name, lat: item.lat, lng: item.lng, sido: item.sido, sigungu: item.sigungu }, true);
  };

  const handleCurrentLocation = async () => {
    setIsResolving(true);
    setMessage(null);
    try {
      select(await getCurrentPlace(), false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '현재 위치를 가져오지 못했어요.');
    } finally {
      setIsResolving(false);
    }
  };

  const showHistory = query.trim().length < 2;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: COLORS.bg,
        fontFamily: FONT_FAMILY,
        color: COLORS.text,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 20px calc(16px + env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>{title}</h2>
        <button onClick={onClose} aria-label="검색 닫기" style={iconButtonStyle}>
          <Close size={18} />
        </button>
      </div>

      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setMessage(null);
        }}
        placeholder="산, 캠핑장, 낚시터, 동네 이름이나 주소"
        style={{
          marginTop: '20px',
          height: '52px',
          padding: '0 16px',
          borderRadius: '16px',
          border: 'none',
          outline: 'none',
          backgroundColor: COLORS.surfaceStrong,
          fontSize: '16px',
          color: COLORS.text,
          boxSizing: 'border-box',
          width: '100%',
        }}
      />

      <button
        onClick={handleCurrentLocation}
        disabled={isResolving}
        style={{
          marginTop: '12px',
          minHeight: '44px',
          alignSelf: 'flex-start',
          padding: '0 14px',
          border: 'none',
          borderRadius: '22px',
          backgroundColor: COLORS.primarySoft,
          color: COLORS.primary,
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        📍 현재 위치로 보기
      </button>

      {(message || isResolving) && (
        <p style={{ margin: '12px 0 0', fontSize: '13px', color: message ? '#d22030' : COLORS.textHint }}>
          {message ?? '위치를 확인하고 있어요'}
        </p>
      )}

      <div style={{ flex: 1, overflowY: 'auto', marginTop: '16px' }}>
        {showHistory ? (
          <>
            <p style={sectionLabelStyle}>최근 검색</p>
            {searchHistory.length === 0 && (
              <p style={{ fontSize: '15px', color: COLORS.textHint }}>최근 검색한 장소가 없어요</p>
            )}
            {searchHistory.map((place) => (
              <div key={`${place.label}-${place.lat}`} style={rowStyle}>
                <button onClick={() => select(place, true)} style={rowButtonStyle}>
                  🕘 {place.label}
                </button>
                <button
                  onClick={() => preferenceActions.removeSearchHistory(place)}
                  aria-label={`${place.label} 검색 기록 삭제`}
                  style={iconButtonStyle}
                >
                  <Close size={18} />
                </button>
              </div>
            ))}
          </>
        ) : (
          <>
            {places.length > 0 && <p style={sectionLabelStyle}>장소</p>}
            {places.map((item) => (
              <button
                key={`${item.name}-${item.lat}-${item.lng}`}
                onClick={() => handleSelectPlace(item)}
                disabled={isResolving}
                style={{ ...rowButtonStyle, display: 'block', width: '100%', padding: '14px 0', borderBottom: `1px solid ${COLORS.divider}` }}
              >
                <span style={{ display: 'block', fontSize: '15px', fontWeight: 500 }}>📍 {item.name}</span>
                <span style={{ display: 'block', marginTop: '2px', fontSize: '13px', color: COLORS.textHint }}>
                  {item.category && `${item.category.split('>').pop()} · `}
                  {item.address}
                </span>
              </button>
            ))}
            {results.length > 0 && <p style={{ ...sectionLabelStyle, marginTop: places.length > 0 ? '20px' : 0 }}>주소</p>}
            {(loading || placesLoading) && results.length === 0 && places.length === 0 && (
              <p style={{ fontSize: '15px', color: COLORS.textHint }}>검색하고 있어요</p>
            )}
            {!loading && !placesLoading && error && places.length === 0 && (
              <p style={{ fontSize: '15px', color: '#d22030' }}>{error}</p>
            )}
            {!loading && !placesLoading && !error && results.length === 0 && places.length === 0 && (
              <p style={{ fontSize: '15px', color: COLORS.textHint }}>검색 결과가 없어요. 장소 이름이나 동 이름으로 검색해 보세요.</p>
            )}
            {results.map((item, idx) => (
              <button
                key={`${item.bdMgtSn ?? idx}-${idx}`}
                onClick={() => handleSelectAddress(item)}
                disabled={isResolving}
                style={{ ...rowButtonStyle, display: 'block', width: '100%', padding: '14px 0', borderBottom: `1px solid ${COLORS.divider}` }}
              >
                <span style={{ display: 'block', fontSize: '15px', fontWeight: 500 }}>{item.roadAddrPart1}</span>
                <span style={{ display: 'block', marginTop: '2px', fontSize: '13px', color: COLORS.textHint }}>{item.jibunAddr}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

const iconButtonStyle = {
  width: '44px',
  height: '44px',
  border: 'none',
  background: 'none',
  color: COLORS.textDisabled,
  fontSize: '16px',
  cursor: 'pointer',
} as const;

const sectionLabelStyle = {
  margin: '0 0 4px',
  fontSize: '13px',
  fontWeight: 600,
  color: COLORS.textHint,
} as const;

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: `1px solid ${COLORS.divider}`,
} as const;

const rowButtonStyle = {
  flex: 1,
  minHeight: '48px',
  textAlign: 'left',
  border: 'none',
  background: 'none',
  color: COLORS.text,
  fontSize: '15px',
  cursor: 'pointer',
  padding: 0,
} as const;
