import React, { useMemo } from 'react';
import { TYPE_LABELS } from '../constants';
import { studyStyles as styles } from '../studyStyles';

const sortByLabel = (a, b) => {
  const labelA = TYPE_LABELS[a.type] || a.type;
  const labelB = TYPE_LABELS[b.type] || b.type;
  return labelA.localeCompare(labelB, 'ko');
};

const useGenerationSummary = (logs) => useMemo(() => {
  if (!Array.isArray(logs)) {
    return { items: [], total: null };
  }

  const map = new Map();
  let total = null;

  logs.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const { stage, type } = entry;
    if (type === 'all') {
      if (stage === 'all_complete') {
        total = Number(entry.delivered) || 0;
      }
      return;
    }
    if (!type) return;

    const record = map.get(type) || {
      type,
      requested: 0,
      cached: 0,
      generated: 0,
      delivered: 0
    };

    switch (stage) {
      case 'type_start':
        record.requested = Number(entry.requested) || record.requested;
        break;
      case 'cache_fetch':
        record.cached += Number(entry.delivered) || 0;
        break;
      case 'ai_generated':
      case 'static_generated':
        record.generated += Number(entry.delivered) || 0;
        break;
      case 'type_complete':
        record.delivered = Number(entry.delivered) || record.delivered;
        if (!record.requested) {
          record.requested = Number(entry.requested) || record.requested;
        }
        break;
      default:
        break;
    }

    map.set(type, record);
  });

  const items = Array.from(map.values()).sort(sortByLabel);
  return { items, total };
}, [logs]);

const GenerationSummary = ({ logs }) => {
  const summary = useGenerationSummary(logs);
  if (!summary.items.length) return null;

  return (
    <div style={styles.generationSummary} className="no-print">
      <div style={styles.generationSummaryHeader}>✨ 문제 생성 요약</div>
      <div style={styles.generationSummaryBody}>
        {summary.items.map((item) => {
          const typeLabel = TYPE_LABELS[item.type] || item.type;
          const cached = Number(item.cached || 0);
          const generated = Number(item.generated || 0);
          const delivered = Number.isFinite(item.delivered) ? Number(item.delivered) : cached + generated;
          const requested = Number(item.requested || 0);
          const isPartial = requested > 0 && delivered < requested;
          const missing = Math.max(0, requested - delivered);

          return (
            <div key={item.type} style={styles.generationSummaryRow}>
              <div style={styles.generationSummaryType}>{typeLabel}</div>
              <div style={styles.generationSummaryStats}>
                <span>요청 {requested}문</span>
                <span>캐시 {cached}문</span>
                <span>AI {generated}문</span>
                <span>총 {delivered}문</span>
                {isPartial && (
                  <span style={styles.generationSummaryWarning}>⚠️ {missing}문은 조건 미충족으로 제외</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {typeof summary.total === 'number' ? (
        <div style={styles.generationSummaryFooter}>이번 세트는 총 {summary.total}문으로 구성됐어요.</div>
      ) : null}
    </div>
  );
};

export default GenerationSummary;
