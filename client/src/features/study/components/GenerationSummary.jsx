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

const SUMMARY_PRESETS = [
  {
    stored: '📦 준비해 둔 문제',
    fresh: '🔥 방금 만든 문제',
    footer: (total) => `🚀 이번 세트는 총 ${total}문! 집중해서 풀어봐요!`
  },
  {
    stored: '🗂️ 보관 중인 문제',
    fresh: '✨ 새로 만든 문제',
    footer: (total) => `🎯 총 ${total}문 확보! 지금 바로 도전해요!`
  },
  {
    stored: '💾 저장된 문제',
    fresh: '🌟 새로 생성된 문제',
    footer: (total) => `🌈 준비된 문제는 총 ${total}문! 가볍게 스타트해요!`
  }
];

const GenerationSummary = ({ logs }) => {
  const summary = useGenerationSummary(logs);
  const summaryPreset = useMemo(() => {
    if (!Array.isArray(logs) || !logs.length) {
      return SUMMARY_PRESETS[0];
    }
    const seedSource = logs[logs.length - 1]?.timestamp
      || logs[logs.length - 1]?.stage
      || `${logs.length}_${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < seedSource.length; i += 1) {
      hash = (hash * 31 + seedSource.charCodeAt(i)) % SUMMARY_PRESETS.length;
    }
    return SUMMARY_PRESETS[hash] || SUMMARY_PRESETS[0];
  }, [logs]);
  if (!summary.items.length) return null;

  return (
    <div style={styles.generationSummary} className="no-print">
      <div style={styles.generationSummaryHeader}>✨ 문제 생성 요약</div>
      <div style={styles.generationSummaryBody}>
        {summary.items.map((item, index) => {
          const typeLabel = TYPE_LABELS[item.type] || item.type;
          const cached = Number(item.cached || 0);
          const generated = Number(item.generated || 0);
          const delivered = Number.isFinite(item.delivered) ? Number(item.delivered) : cached + generated;
          const requested = Number(item.requested || 0);
          const isPartial = requested > 0 && delivered < requested;
          const missing = Math.max(0, requested - delivered);
          const storedLabel = summaryPreset.stored || '📦 준비해 둔 문제';
          const freshLabel = summaryPreset.fresh || '🔥 방금 만든 문제';

          return (
            <div key={item.type} style={styles.generationSummaryRow}>
              <div style={styles.generationSummaryType}>{typeLabel}</div>
              <div style={styles.generationSummaryStats}>
                <span>요청 {requested}문</span>
                <span>{storedLabel} {cached}문</span>
                <span>{freshLabel} {generated}문</span>
                <span>총 {delivered}문</span>
                {isPartial && (
                  <span style={styles.generationSummaryWarning}>⚠️ {missing}문은 조건 미충족으로 제외</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {(() => {
        if (typeof summary.total !== 'number') return null;
        const footerMessage = typeof summaryPreset.footer === 'function'
          ? summaryPreset.footer(summary.total)
          : `🎉 이번 세트는 총 ${summary.total}문! 마음껏 모험을 시작해 볼까요? 💪`;
        return <div style={styles.generationSummaryFooter}>{footerMessage}</div>;
      })()}
      <div style={styles.generationSummaryHint}>
        <span role="img" aria-label="신고 안내">💡</span>
        <span>
          {logs.some((entry) => entry.stage === 'normalize_rescue') &&
          <strong>처음 선택한 지문이 너무 짧아 규칙형 은행 문제로 채웠어요. 지문 수를 조금 늘리면 더 맞춤형 문항이 생성돼요! · </strong>}
          엉뚱한 문항이 보이면 문제 화면 아래의 🚨 신고 버튼을 눌러주세요. 관리자가 검토 후 필요하면 바로 숨겨줄게요!
        </span>
      </div>
    </div>
  );
};

export default GenerationSummary;
