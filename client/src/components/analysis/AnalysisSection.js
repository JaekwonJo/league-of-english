import React from 'react';

const AnalysisSection = ({ title, content }) => (
  <div style={styles.section}>
    <h4 style={styles.sectionTitle}>{title}</h4>
    <div style={styles.sectionContent}>
      {typeof content === 'string' ? <p>{content}</p> : content}
    </div>
  </div>
);

const styles = {
  section: {
    marginBottom: '25px'
  },
  sectionTitle: {
    color: 'var(--text-primary)',
    fontSize: '1.1rem',
    marginBottom: '12px'
  },
  sectionContent: {
    color: 'var(--text-secondary)',
    lineHeight: '1.6'
  }
};

export default AnalysisSection;