import React, { useState, useEffect, useRef } from 'react';

const StudyTimer = ({ isActive = false }) => {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Load saved time from today
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`study_time_${today}`);
    if (saved) {
      setSeconds(parseInt(saved, 10));
    }

    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          const next = s + 1;
          // Auto-save every 10 seconds
          if (next % 10 === 0) {
            const today = new Date().toISOString().split('T')[0];
            localStorage.setItem(`study_time_${today}`, next.toString());
          }
          return next;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive]);

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}시간 ${m}분 ${s}초`;
    return `${m}분 ${s}초`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.icon}>🔥</div>
      <div style={styles.text}>
        오늘 학습 <span style={styles.time}>{formatTime(seconds)}</span>
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    top: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(8px)',
    padding: '8px 16px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    zIndex: 9999,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
  },
  icon: {
    fontSize: '16px'
  },
  text: {
    fontSize: '14px',
    color: '#cbd5e1',
    fontWeight: '500'
  },
  time: {
    color: '#fff',
    fontWeight: '700',
    fontVariantNumeric: 'tabular-nums'
  }
};

export default StudyTimer;
