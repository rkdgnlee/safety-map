// safety-map-toss/src/components/CctvRequestGuideSheet.tsx
import { Close } from './icons';
import { type CSSProperties } from 'react';

interface CctvItem {
  purpose: string;
  address: string;
  camCount: string;
  mngInst: string;
  telno: string;
  installYm: string;
}

interface CctvRequestGuideSheetProps {
  cctv: CctvItem;
  onClose: () => void;
}

// 정보공개청구포털 URL (모바일 가능)
const PORTAL_URL = 'https://www.open.go.kr/rqestPty/rqestPtyMbr/rqestPtyMbrIssue.do';

export default function CctvRequestGuideSheet({ cctv, onClose }: CctvRequestGuideSheetProps) {

  // 자동 작성 내용 생성
  const autoTitle = `[${cctv.mngInst}] CCTV 영상정보 열람 청구`;
  const autoContent = `청구 위치: ${cctv.address}
관리기관: ${cctv.mngInst}
설치목적: ${cctv.purpose}
카메라 대수: ${cctv.camCount}대

위 위치에 설치된 CCTV 영상정보에 대해 개인정보보호법 제35조에 의거하여 열람을 청구합니다.

청구 사유: [본인이 직접 작성 - 예: 사건 발생 일시, 장소, 청구 목적 등]
열람 희망 기간: [작성 필요]
본인 확인 방법: 신분증 지참 방문 또는 공인전자서명`;

  const handleOpenPortal = () => {
    window.open(PORTAL_URL, '_blank');
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 3000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: '#ffffff',
          borderRadius: '24px 24px 0 0',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '0 0 40px',
        }}
      >
        {/* 핸들바 */}
        <div style={{ padding: '16px 20px 0', textAlign: 'center' }}>
          <div style={{
            width: '36px', height: '4px',
            backgroundColor: '#e5e8eb', borderRadius: '2px',
            margin: '0 auto 16px',
          }} />
        </div>

        {/* 헤더 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 20px 16px',
          borderBottom: '1px solid #f2f4f6',
        }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 'bold', color: '#191f28' }}>
              📋 CCTV 정보공개 청구 안내
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#8b95a1' }}>
              개인정보보호법 제35조 기반 공식 청구 절차
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: '#f2f4f6', border: 'none',
              fontSize: '16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Close size={18} />
          </button>
        </div>

        <div style={{ padding: '20px' }}>

          {/* 관할 기관 강조 */}
          <div style={{
            backgroundColor: '#fff8e6',
            border: '1px solid #ffd84d',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '20px',
          }}>
            <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: '700', color: '#b8860b' }}>
              📍 청구 대상 관할 기관
            </p>
            <p style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 'bold', color: '#191f28' }}>
              {cctv.mngInst}
            </p>
            <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#4e5968' }}>
              {cctv.address}
            </p>
            {cctv.telno && (
              <a
                href={`tel:${cctv.telno}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  fontSize: '13px', fontWeight: '600', color: '#2F7058',
                  textDecoration: 'none',
                  backgroundColor: '#eef4ff', padding: '6px 12px', borderRadius: '12px',
                }}
              >
                📞 {cctv.telno} 전화하기
              </a>
            )}
          </div>

          {/* Step 1: 사전 준비 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={s.stepHeader}>
              <span style={s.stepBadge}>Step 1</span>
              <span style={s.stepTitle}>청구 전 준비사항</span>
            </div>
            <div style={s.stepCard}>
              {[
                { icon: '📄', text: '사건 관련 서류 준비 (경찰 접수증, 사고 사실확인서 등)' },
                { icon: '🪪', text: '신분증 (본인 확인용)' },
                { icon: '⚖️', text: '청구 목적 명확화 — 무죄 입증, 과실 없음 증빙, 법적 분쟁 대응 등' },
                { icon: '📅', text: 'CCTV 영상 촬영 일시 및 장소 특정' },
              ].map((item, idx) => (
                <div key={idx} style={s.checkRow}>
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <span style={{ fontSize: '13px', color: '#4e5968', lineHeight: '1.5' }}>{item.text}</span>
                </div>
              ))}
            </div>
            <div style={{
              backgroundColor: '#fff1f0',
              border: '1px solid #ffd6d6',
              borderRadius: '12px',
              padding: '12px',
              marginTop: '10px',
            }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#d44', lineHeight: '1.6' }}>
                ⚠️ CCTV 영상은 보관기간(통상 30일)이 지나면 삭제됩니다. 사건 발생 즉시 청구하세요.
              </p>
            </div>
          </div>

          {/* Step 2: 자동 작성 내용 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={s.stepHeader}>
              <span style={s.stepBadge}>Step 2</span>
              <span style={s.stepTitle}>청구서 작성 내용 (복사해서 사용)</span>
            </div>

            <div style={s.stepCard}>
              <p style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: '700', color: '#8b95a1' }}>
                제목
              </p>
              <div style={s.copyBox}>
                <p style={{ margin: 0, fontSize: '13px', color: '#191f28', fontWeight: '600' }}>
                  {autoTitle}
                </p>
              </div>

              <p style={{ margin: '14px 0 6px', fontSize: '12px', fontWeight: '700', color: '#8b95a1' }}>
                청구 기관
              </p>
              <div style={s.copyBox}>
                <p style={{ margin: 0, fontSize: '13px', color: '#191f28', fontWeight: '600' }}>
                  {cctv.mngInst}
                </p>
              </div>

              <p style={{ margin: '14px 0 6px', fontSize: '12px', fontWeight: '700', color: '#8b95a1' }}>
                청구 내용 (기본 템플릿)
              </p>
              <div style={{ ...s.copyBox, whiteSpace: 'pre-line' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#191f28', lineHeight: '1.8' }}>
                  {autoContent}
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: 포털 이동 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={s.stepHeader}>
              <span style={s.stepBadge}>Step 3</span>
              <span style={s.stepTitle}>정보공개포털에서 청구 제출</span>
            </div>
            <div style={s.stepCard}>
              {[
                '정보공개포털 회원가입 또는 로그인',
                '청구서 작성 — 위 내용 복사 붙여넣기',
                '본인 인증 (공동인증서 또는 간편인증)',
                '제출 후 처리 결과 확인 (통상 10일 이내)',
              ].map((text, idx) => (
                <div key={idx} style={s.checkRow}>
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    backgroundColor: '#191f28', color: '#fff',
                    fontSize: '12px', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: '13px', color: '#4e5968', lineHeight: '1.5' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 포털 이동 버튼 */}
          <button
            onClick={handleOpenPortal}
            style={{
              width: '100%', padding: '18px',
              backgroundColor: '#333D4B', color: '#ffffff',
              border: 'none', borderRadius: '16px',
              fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(51,61,75,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            🌐 정보공개포털 바로가기
          </button>
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#b0b8c1', margin: '8px 0 0' }}>
            open.go.kr — 기본 브라우저로 열립니다
          </p>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  stepHeader: {
    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px',
  },
  stepBadge: {
    backgroundColor: '#191f28', color: '#ffffff',
    fontSize: '12px', fontWeight: '700',
    padding: '3px 10px', borderRadius: '10px',
  },
  stepTitle: {
    fontSize: '14px', fontWeight: '700', color: '#191f28',
  },
  stepCard: {
    backgroundColor: '#f9fafb', borderRadius: '16px', padding: '16px',
    display: 'flex', flexDirection: 'column', gap: '12px',
  },
  checkRow: {
    display: 'flex', alignItems: 'flex-start', gap: '10px',
  },
  copyBox: {
    backgroundColor: '#ffffff', border: '1px solid #e5e8eb',
    borderRadius: '12px', padding: '12px',
  },
};