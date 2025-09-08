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
    borderBottom: '1px solid #e2e8f0'
  },
  passageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
    gap: '10px'
  },
  passageButton: {
    padding: '10px',
    background: '#f1f5f9',
    border: '2px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s'
  },
  passageButtonSelected: {
    background: '#3b82f6',
    color: 'white',
    borderColor: '#2563eb'
  },
  passageButtonAnalyzed: {
    background: '#10b981',
    color: 'white'
  },
  checkMark: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    fontSize: '12px'
  }
};

export default PassageSelector;