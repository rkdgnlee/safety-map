
export default function BannerScreen() {
  return (
    <div style={{
      width: '100%',
      height: '180px',
      backgroundColor: '#f2f4f6',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px dashed #d1d6db',
      overflow: 'hidden'
    }}>
      {/* 실제 이미지를 적용할 공간 */}
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <span style={{ fontSize: '24px' }}>🖼️</span>
        <p style={{ margin: '8px 0 0 0', fontWeight: 'bold', color: '#4e5968' }}>중간 추천 배너 영역</p>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#8b95a1' }}>큰 사이즈 이미지 배너 배치</p>
      </div>
    </div>
  );
}