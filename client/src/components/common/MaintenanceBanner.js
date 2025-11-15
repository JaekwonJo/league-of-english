import React from 'react';

const MaintenanceBanner = () => {
  const isOn = String(process.env.REACT_APP_MAINTENANCE || '').trim() === '1';
  if (!isOn) return null;
  return (
    <div style={styles.bar}>
      현재 점검 중입니다. 학습 데이터는 안전하며, 잠시 후 자동으로 정상화됩니다.
    </div>
  );
};

const styles = {
  bar: {
    position: 'sticky',
    top: 0,
    zIndex: 1200,
    padding: '10px 16px',
    background: 'linear-gradient(90deg, #f59e0b, #f97316)',
    color: '#0b1220',
    fontWeight: 800,
    borderRadius: 12,
    marginBottom: 12
  }
};

export default MaintenanceBanner;

