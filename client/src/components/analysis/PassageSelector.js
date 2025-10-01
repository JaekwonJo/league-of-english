import React from 'react';

const PassageSelector = ({ 
  totalPassages, 
  currentPassage, 
  analyzedPassages, 
  onPassageSelect 
}) => {
  return (
    <div style={styles.passageSelector}>
      <div style={styles.passageGrid}>
        {[...Array(totalPassages)].map((_, idx) => {
          const passageNum = idx + 1;
          const isAnalyzed = analyzedPassages.has(passageNum);
          const isSelected = currentPassage === passageNum;
          
          return (
            <button
              key={passageNum}
              style={{
                ...styles.passageButton,
                ...(isSelected ? styles.passageButtonSelected : {}),
                ...(isAnalyzed ? styles.passageButtonAnalyzed : {})
              }}
              onClick={() => onPassageSelect(passageNum)}
            >
              {passageNum}
              {isAnalyzed && <span style={styles.checkMark}>?</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  passageSelector: {
    padding: '20px 30px',
    borderBottom: '1px solid var(--border-subtle)'
  },
  passageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
    gap: '10px'
  },
  passageButton: {
    padding: '10px',
    background: 'var(--surface-soft-strong)',
    border: '2px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s'
  },
  passageButtonSelected: {
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    borderColor: 'var(--accent-primary-strong)'
  },
  passageButtonAnalyzed: {
    background: 'var(--success)',
    color: 'var(--text-on-accent)'
  },
  checkMark: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    fontSize: '12px'
  }
};

export default PassageSelector;