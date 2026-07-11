"use client"

import { useEffect, useState } from "react";

export default function FirstGuideToast() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3500); // 3초 후 자동 사라짐
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: '180px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(25, 31, 40, 0.85)',
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: '500',
      whiteSpace: 'nowrap',
      zIndex: 20,
      backdropFilter: 'blur(6px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      transition: 'opacity 0.3s ease',
    }}>
      🗺️  지도를 드래그하면 범죄 데이터가 나타나요
    </div>
  );
}