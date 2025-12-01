import React, { useEffect, useState, useCallback } from 'react';
import CommonHero from '../components/common/CommonHero';
import EagleGuideChip from '../components/common/EagleGuideChip';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    padding: '24px 24px 40px'
  },
  containerMobile: {
    padding: '20px 16px 32px',
    gap: '18px'
  },
  buttonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center'
  },
  primaryButton: {
    padding: '14px 22px',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, rgba(79,70,229,1) 0%, rgba(14,165,233,1) 100%)',
    color: 'var(--text-on-accent)',
    fontWeight: 800,
    fontSize: '16px',
    cursor: 'pointer',
    minWidth: '220px',
    boxShadow: '0 18px 38px rgba(79, 70, 229, 0.28)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  primaryButtonMobile: {
    width: '100%',
    minWidth: 'unset'
  },
  secondaryButton: {
    padding: '12px 20px',
    borderRadius: '14px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)',
    color: 'var(--tone-hero)',
    fontWeight: 700,
    cursor: 'pointer',
    minWidth: '180px',
    boxShadow: '0 12px 26px rgba(15, 23, 42, 0.12)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  secondaryButtonMobile: {
    width: '100%',
    minWidth: 'unset'
  },
  infoSection: {
    padding: '18px 20px',
    borderRadius: '18px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)'
  },
  infoTitle: {
    margin: '0 0 10px',
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)'
  },
  infoList: {
    margin: 0,
    paddingLeft: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '14px',
    color: 'var(--tone-strong)'
  }
};

const WorkbookPage = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateViewport = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth <= 768);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const responsiveStyle = useCallback(
    (base, mobileOverrides = {}) => (isMobile ? { ...base, ...(mobileOverrides || {}) } : base),
    [isMobile]
  );

  const goToReadingTutor = () => {
    if (typeof window === 'undefined') return;
    window.location.href = '/reading-tutor-select';
  };

  const goToAITutorHub = () => {
    if (typeof window === 'undefined') return;
    window.location.href = '/ai-tutor';
  };

  return (
    <div style={responsiveStyle(styles.container, styles.containerMobile)}>
      <CommonHero
        badge="AI Workbook"
        title="Workbook 🎄"
        subtitle="워크북 학습은 이제 AI 튜터처럼, 지문 하나를 골라 10단계 미션으로 한 번에 정리하는 흐름으로 바뀌었어요. 먼저 독해 튜터에서 지문을 선택해 볼까요?"
      />

      <div style={styles.buttonRow}>
        <button
          type="button"
          style={responsiveStyle(styles.primaryButton, styles.primaryButtonMobile)}
          onClick={goToReadingTutor}
        >
          독해 튜터에서 지문 고르기
        </button>
        <button
          type="button"
          style={responsiveStyle(styles.secondaryButton, styles.secondaryButtonMobile)}
          onClick={goToAITutorHub}
        >
          AI 튜터 홈으로 가기
        </button>
        <EagleGuideChip
          text="지문 카드 아래 있는 '🤖 AI 워크북' 버튼을 누르면, 그 지문으로 10단계 워크북이 자동으로 열려요."
          variant="accent"
        />
      </div>

      <section style={styles.infoSection}>
        <h3 style={styles.infoTitle}>AI 워크북 학습 순서 (간단 정리)</h3>
        <ul style={styles.infoList}>
          <li>① 상단 메뉴에서 <strong>독해 튜터</strong>로 들어가 문서를 선택해요.</li>
          <li>② 문서 안에서 공부할 지문(문제 번호)을 고른 뒤, 카드 아래의 <strong>🤖 AI 워크북</strong> 버튼을 눌러요.</li>
          <li>③ 같은 지문으로 <strong>STEP 1~10</strong>까지 해석·빈칸·배열·영작·제목/주제 정리 미션을 차례대로 진행해요.</li>
        </ul>
      </section>
    </div>
  );
};

export default WorkbookPage;

