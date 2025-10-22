import React, { useMemo } from 'react';

const containerStyle = {
  maxWidth: '720px',
  margin: '80px auto',
  padding: '32px',
  borderRadius: '24px',
  boxShadow: '0 30px 60px var(--surface-shadow)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  textAlign: 'center',
  border: '1px solid var(--surface-border)'
};

const titleStyle = {
  fontSize: '28px',
  fontWeight: 800,
  marginBottom: '16px',
};

const summaryStyle = {
  fontSize: '18px',
  marginBottom: '18px',
  lineHeight: 1.6,
};

const hintStyle = {
  fontSize: '14px',
  marginBottom: '18px',
  color: 'var(--text-secondary)'
};

const detailBoxStyle = {
  textAlign: 'left',
  background: 'var(--surface-soft)',
  borderRadius: '14px',
  padding: '16px',
  margin: '0 auto 20px auto',
  maxWidth: '100%',
  overflowX: 'auto',
  border: '1px solid var(--surface-border)'
};

const buttonRowStyle = {
  display: 'flex',
  justifyContent: 'center',
  gap: '12px',
  flexWrap: 'wrap'
};

const primaryButtonStyle = {
  padding: '12px 22px',
  borderRadius: '12px',
  border: 'none',
  background: 'var(--accent-gradient)',
  color: 'var(--text-on-accent)',
  fontSize: '15px',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 16px 28px var(--accent-shadow)'
};

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  background: 'var(--surface-soft)',
  color: 'var(--text-primary)',
  boxShadow: '0 12px 24px var(--surface-shadow)'
};

const FriendlyError = ({
  error,
  title,
  summary,
  hint,
  detail,
  stack,
  onRetry,
  onHome
}) => {
  const payload = useMemo(() => {
    if (!error || typeof error === 'string') {
      return {
        summary: typeof error === 'string' ? error : undefined,
      };
    }
    return error;
  }, [error]);

  const finalTitle = title || payload?.title || '😢 문제가 발생했습니다';
  const finalSummary = summary || payload?.summary || '예상치 못한 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';
  const finalHint = hint || payload?.hint || null;
  const finalDetail = detail || payload?.detail || '';
  const finalStack = stack || payload?.stack || '';

  return (
    <div style={containerStyle} role="alert" aria-live="assertive">
      <h2 style={titleStyle}>{finalTitle}</h2>
      <p style={summaryStyle}>{finalSummary}</p>
      {finalHint && <p style={hintStyle}>{finalHint}</p>}

      {(finalDetail || finalStack) && (
        <details style={{ marginBottom: '20px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>더 자세한 오류 정보 보기</summary>
          <div style={detailBoxStyle}>
            {finalDetail && (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--font-mono, "Fira Code", monospace)' }}>
                {finalDetail}
              </pre>
            )}
            {finalStack && (
              <pre style={{
                marginTop: finalDetail ? '16px' : 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono, "Fira Code", monospace)'
              }}>
                {finalStack}
              </pre>
            )}
          </div>
        </details>
      )}

      <div style={buttonRowStyle}>
        {typeof onRetry === 'function' && (
          <button type="button" onClick={onRetry} style={primaryButtonStyle}>
            다시 시도하기
          </button>
        )}
        {typeof onHome === 'function' && (
          <button type="button" onClick={onHome} style={secondaryButtonStyle}>
            홈으로 이동
          </button>
        )}
      </div>
    </div>
  );
};

export default FriendlyError;
