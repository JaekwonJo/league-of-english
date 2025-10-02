import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api.service';
import problemTypes from '../../config/problemTypes.json';

const EXPORT_STEP = 5;
const EXPORT_MAX_TOTAL = 100;
const TYPE_CONFIG = problemTypes?.problemTypes || {};

const typeEntries = Object.entries(TYPE_CONFIG).map(([key, value]) => ({
  key,
  name: value?.name || key,
  icon: value?.icon || ''
}));

const DIFFICULTY_OPTIONS = [
  { key: 'basic', label: '쉬움' },
  { key: 'medium', label: '보통' },
  { key: 'advanced', label: '어려움' },
  { key: 'challenge', label: '도전' }
];

const sanitizeCounts = (rawCounts = {}, selectedTypes, summary = {}) => {
  const result = {};
  selectedTypes.forEach((type) => {
    const available = Number(summary?.[type]) || 0;
    const raw = Number(rawCounts?.[type]) || 0;
    const snapped = Math.max(0, Math.floor(raw / EXPORT_STEP) * EXPORT_STEP);
    result[type] = Math.min(snapped, available, EXPORT_MAX_TOTAL);
  });
  return result;
};

const ProblemLibrary = ({ documents = [] }) => {
  const defaultDocumentId = documents.length ? documents[0].id : null;
  const [documentId, setDocumentId] = useState(defaultDocumentId);
  const [selectedTypes, setSelectedTypes] = useState(() => typeEntries.map((item) => item.key));
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [problems, setProblems] = useState([]);
  const [summary, setSummary] = useState({});
  const [exportCounts, setExportCounts] = useState(() => sanitizeCounts({}, selectedTypes));
  const [includeSolutions, setIncludeSolutions] = useState(true);
  const [selectedDifficulties, setSelectedDifficulties] = useState(() => DIFFICULTY_OPTIONS.map((item) => item.key));
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [noteEditor, setNoteEditor] = useState({ open: false, problemId: null, note: '', saving: false, error: '' });

  useEffect(() => {
    if (!documents.length) {
      setDocumentId(null);
      return;
    }
    if (!documentId || !documents.find((doc) => doc.id === documentId)) {
      setDocumentId(documents[0].id);
    }
  }, [documents, documentId]);

  const refreshCountsFromSummary = useCallback((newSummary) => {
    setSummary(newSummary);
    setExportCounts((prev) => sanitizeCounts(prev, selectedTypes, newSummary));
  }, [selectedTypes]);

  const loadProblems = useCallback(async () => {
    if (!documentId || !selectedTypes.length) {
      setProblems([]);
      refreshCountsFromSummary({});
      return;
    }
    try {
      setLoading(true);
      setError('');
      const requestParams = {
        documentId,
        types: selectedTypes,
        limit,
        aiOnly: true
      };
      if (selectedDifficulties.length && selectedDifficulties.length !== DIFFICULTY_OPTIONS.length) {
        requestParams.difficulties = selectedDifficulties;
      }

      const response = await api.problems.library(requestParams);
      setProblems(Array.isArray(response?.problems) ? response.problems : []);
      refreshCountsFromSummary(response?.summary || {});
    } catch (err) {
      setError(err?.message || '문제 라이브러리를 불러오지 못했어요.');
      setProblems([]);
      refreshCountsFromSummary({});
    } finally {
      setLoading(false);
    }
  }, [documentId, selectedTypes, selectedDifficulties, limit, refreshCountsFromSummary]);

  useEffect(() => {
    loadProblems();
  }, [loadProblems]);

  const availableTypes = useMemo(() => typeEntries.filter((entry) => selectedTypes.includes(entry.key)), [selectedTypes]);

  const handleToggleType = (typeKey) => {
    setSelectedTypes((prev) => {
      if (prev.includes(typeKey)) {
        const next = prev.filter((item) => item !== typeKey);
        return next.length ? next : prev; // 최소 1개 유지
      }
      return [...prev, typeKey];
    });
  };

  const handleToggleDifficulty = (difficultyKey) => {
    setSelectedDifficulties((prev) => {
      if (prev.includes(difficultyKey)) {
        const next = prev.filter((item) => item !== difficultyKey);
        return next.length ? next : prev;
      }
      return [...prev, difficultyKey];
    });
  };

  const handleResetDifficulties = () => {
    setSelectedDifficulties(DIFFICULTY_OPTIONS.map((item) => item.key));
  };

  useEffect(() => {
    setExportCounts((prev) => sanitizeCounts(prev, selectedTypes, summary));
  }, [selectedTypes, summary]);

  const handleCountChange = (type, value) => {
    setExportCounts((prev) => {
      const raw = Number(value);
      if (Number.isNaN(raw)) return prev;
      const snapped = Math.max(0, Math.floor(raw / EXPORT_STEP) * EXPORT_STEP);
      const capped = Math.min(snapped, Number(summary?.[type]) || 0, EXPORT_MAX_TOTAL);
      return { ...prev, [type]: capped };
    });
  };

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const response = await api.problems.exportHistory({ limit: 12 });
      setHistory(Array.isArray(response?.history) ? response.history : []);
    } catch (err) {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const openNoteEditor = useCallback((problem) => {
    if (!problem || !problem.id) return;
    setNoteEditor({
      open: true,
      problemId: problem.id,
      note: (problem.note || '').trim(),
      saving: false,
      error: ''
    });
  }, []);

  const closeNoteEditor = useCallback(() => {
    setNoteEditor({ open: false, problemId: null, note: '', saving: false, error: '' });
  }, []);

  useEffect(() => {
    if (!noteEditor.open) return undefined;
    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeNoteEditor();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [noteEditor.open, closeNoteEditor]);

  const handleNoteChange = (value) => {
    setNoteEditor((prev) => ({ ...prev, note: value.slice(0, 1000) }));
  };

  const handleSaveNote = useCallback(async () => {
    if (!noteEditor.problemId || noteEditor.saving) return;
    try {
      setNoteEditor((prev) => ({ ...prev, saving: true, error: '' }));
      const response = await api.problems.saveNote(noteEditor.problemId, { note: noteEditor.note });
      const updatedProblem = response?.problem;
      if (!updatedProblem) {
        setNoteEditor((prev) => ({ ...prev, saving: false, error: '메모 정보를 불러오지 못했어요.' }));
        return;
      }
      setProblems((prev) => prev.map((item) => (item.id === updatedProblem.id ? { ...item, note: updatedProblem.note || '' } : item)));
      closeNoteEditor();
    } catch (err) {
      setNoteEditor((prev) => ({ ...prev, saving: false, error: err?.message || '메모를 저장하지 못했어요.' }));
    }
  }, [noteEditor.problemId, noteEditor.note, noteEditor.saving, closeNoteEditor]);

  const renderNotePreview = useCallback((note = '') => {
    const trimmed = String(note || '').trim();
    if (!trimmed) return '메모 없음';
    return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
  }, []);

  const formatHistoryTimestamp = useCallback((value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    const hh = String(parsed.getHours()).padStart(2, '0');
    const min = String(parsed.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }, []);

  const handleExport = async () => {
    if (!documentId) {
      alert('PDF로 변환할 문서를 먼저 선택해 주세요.');
      return;
    }
    const filteredCounts = Object.fromEntries(
      Object.entries(exportCounts)
        .filter(([, count]) => Number(count) > 0)
    );
    const total = Object.values(filteredCounts).reduce((sum, count) => sum + count, 0);
    if (!total) {
      alert('내보낼 문제 수를 5문제 단위로 입력해 주세요.');
      return;
    }
    if (total > EXPORT_MAX_TOTAL) {
      alert(`PDF는 최대 ${EXPORT_MAX_TOTAL}문제까지만 한 번에 받을 수 있어요.`);
      return;
    }

    try {
      setExporting(true);
      const blob = await api.problems.exportPdf({
        documentId,
        counts: filteredCounts,
        limit: total,
        includeSolutions,
        types: Object.keys(filteredCounts)
      });
      if (blob instanceof Blob) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `problem-library-${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      loadHistory();
    } catch (err) {
      alert(err?.message || 'PDF 내보내기에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setExporting(false);
    }
  };

  const totalAvailable = useMemo(() => Object.values(summary || {}).reduce((sum, count) => sum + Number(count || 0), 0), [summary]);
  const totalSelected = useMemo(() => Object.values(exportCounts || {}).reduce((sum, count) => sum + Number(count || 0), 0), [exportCounts]);

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>📚 문제 라이브러리</h2>
          <p style={styles.subtitle}>저장된 AI 생성 문제를 살펴보고, 원하는 만큼 PDF로 한 번에 내려 받을 수 있어요.</p>
        </div>
        <div style={styles.documentSelectWrapper}>
          <label style={styles.label}>자료 선택</label>
          <select
            value={documentId || ''}
            onChange={(event) => setDocumentId(Number(event.target.value) || null)}
            style={styles.select}
          >
            {documents.length === 0 && <option value="">등록된 자료가 없습니다</option>}
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>{doc.title || `자료 ${doc.id}`}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.filterRow}>
        <div style={styles.filterColumn}>
          <div style={styles.filterLabel}>유형</div>
          <div style={styles.typeChips}>
            {typeEntries.map((entry) => {
              const active = selectedTypes.includes(entry.key);
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => handleToggleType(entry.key)}
                  style={{
                    ...styles.typeChip,
                    ...(active ? styles.typeChipActive : {})
                  }}
                >
                  <span style={styles.typeChipIcon}>{entry.icon}</span>
                  {entry.name}
                  <span style={styles.typeChipCount}>{summary?.[entry.key] || 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={styles.filterColumn}>
          <div style={styles.filterLabel}>
            난이도
            <button type="button" onClick={handleResetDifficulties} style={styles.difficultyReset}>
              전체 선택
            </button>
          </div>
          <div style={styles.difficultyChips}>
            {DIFFICULTY_OPTIONS.map((option) => {
              const active = selectedDifficulties.includes(option.key);
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleToggleDifficulty(option.key)}
                  style={{
                    ...styles.difficultyChip,
                    ...(active ? styles.difficultyChipActive : {})
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={styles.limitControl}>
          <label style={styles.label}>표시 개수</label>
          <input
            type="number"
            min={10}
            max={100}
            step={5}
            value={limit}
            onChange={(event) => setLimit(Math.max(5, Math.min(100, Number(event.target.value) || 10)))}
            style={styles.limitInput}
          />
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={styles.loadingBox}>문제를 정리하고 있어요. 잠시만 기다려 주세요…</div>
        ) : problems.length === 0 ? (
          <div style={styles.loadingBox}>선택한 조건에 해당하는 저장 문제가 아직 없어요.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>유형</th>
                <th style={styles.th}>출처</th>
                <th style={styles.th}>메모</th>
                <th style={styles.th}>문항</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem) => (
                <tr key={problem.id}>
                  <td style={styles.tdType}>{TYPE_CONFIG[problem.type]?.name || problem.type}</td>
                  <td style={styles.tdSource}>{problem.sourceLabel || problem.metadata?.documentTitle || '-'}</td>
                  <td style={styles.tdNote}>
                    <div style={styles.notePreview}>{renderNotePreview(problem.note)}</div>
                    <button type="button" style={styles.noteButton} onClick={() => openNoteEditor(problem)}>
                      메모 편집
                    </button>
                  </td>
                  <td style={styles.tdQuestion}>{problem.question || problem.mainText || '문항 정보를 준비 중입니다.'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.exportPanel}>
        <div>
          <h3 style={styles.exportTitle}>PDF 내보내기 설정</h3>
          <p style={styles.exportHint}>최대 {EXPORT_MAX_TOTAL}문제까지 5문제 단위로 선택할 수 있어요. (보유: {totalAvailable}문)</p>
        </div>
        <div style={styles.exportCounts}>
          {availableTypes.map((entry) => (
            <div key={entry.key} style={styles.exportCountItem}>
              <label style={styles.exportLabel}>{entry.name}</label>
              <input
                type="number"
                min={0}
                step={EXPORT_STEP}
                value={exportCounts?.[entry.key] || 0}
                onChange={(event) => handleCountChange(entry.key, event.target.value)}
                style={styles.exportInput}
              />
              <span style={styles.exportMax}>/ {summary?.[entry.key] || 0}</span>
            </div>
          ))}
        </div>
        <div style={styles.exportFooter}>
          <label style={styles.exportToggle}>
            <input
              type="checkbox"
              checked={includeSolutions}
              onChange={(event) => setIncludeSolutions(event.target.checked)}
            />
            해설 포함
          </label>
          <div style={styles.exportSummary}>선택: {totalSelected}문</div>
          <button
            type="button"
            style={{
              ...styles.exportButton,
              ...(exporting || totalSelected === 0 ? styles.exportButtonDisabled : {})
            }}
            disabled={exporting || totalSelected === 0}
            onClick={handleExport}
          >
            {exporting ? 'PDF 생성 중…' : 'PDF 내보내기'}
          </button>
        </div>
      </div>

      <div style={styles.historyPanel}>
        <div style={styles.historyHeader}>
          <h3 style={styles.historyTitle}>최근 PDF 내보내기 기록</h3>
          <button
            type="button"
            style={{
              ...styles.historyRefresh,
              ...(historyLoading ? styles.exportButtonDisabled : {})
            }}
            onClick={loadHistory}
            disabled={historyLoading}
          >
            {historyLoading ? '불러오는 중…' : '새로고침'}
          </button>
        </div>
        {historyLoading ? (
          <div style={styles.loadingBox}>내보내기 기록을 정리하고 있어요…</div>
        ) : history.length === 0 ? (
          <div style={styles.historyEmpty}>아직 PDF로 내보낸 기록이 없어요. 원하는 문제를 골라 첫 PDF를 만들어 볼까요? ✨</div>
        ) : (
          <ul style={styles.historyList}>
            {history.map((entry) => {
              const breakdownEntries = Object.entries(entry.counts || {}).filter(([, value]) => Number(value) > 0);
              const breakdown = breakdownEntries.length
                ? breakdownEntries
                    .map(([type, value]) => `${TYPE_CONFIG[type]?.name || type} ${value}문`)
                    .join(', ')
                : `총 ${entry.total}문`;
              return (
                <li key={entry.id} style={styles.historyItem}>
                  <div style={styles.historyMeta}>
                    <span>{formatHistoryTimestamp(entry.createdAt)}</span>
                    {entry.documentTitle && <span> · {entry.documentTitle}</span>}
                    <span> · {entry.user?.name || '관리자'}</span>
                    <span> · {entry.includeSolutions ? '해설 포함' : '문항만'}</span>
                  </div>
                  <div style={styles.historyCounts}>{breakdown}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {noteEditor.open && (
        <div
          style={styles.noteBackdrop}
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !noteEditor.saving) {
              closeNoteEditor();
            }
          }}
        >
          <div style={styles.noteModal}>
            <h3 style={styles.noteTitle}>문항 메모</h3>
            <textarea
              value={noteEditor.note}
              onChange={(event) => handleNoteChange(event.target.value)}
              style={styles.noteTextarea}
              placeholder="이 문항에 대한 메모를 입력해 주세요."
            />
            <div style={styles.noteMeta}>
              <span>{noteEditor.note.length} / 1000자</span>
              {noteEditor.error && <span style={styles.noteError}>{noteEditor.error}</span>}
            </div>
            <div style={styles.noteActions}>
              <button type="button" style={styles.noteCancel} onClick={closeNoteEditor} disabled={noteEditor.saving}>
                취소
              </button>
              <button
                type="button"
                style={{
                  ...styles.noteSave,
                  ...(noteEditor.saving ? styles.exportButtonDisabled : {})
                }}
                onClick={handleSaveNote}
                disabled={noteEditor.saving}
              >
                {noteEditor.saving ? '저장 중…' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    marginTop: '28px',
    padding: '24px',
    borderRadius: '20px',
    background: 'rgba(15, 23, 42, 0.55)',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    color: 'var(--border-subtle)',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.45)'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
    flexWrap: 'wrap'
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    margin: '0 0 8px 0'
  },
  subtitle: {
    margin: 0,
    color: 'var(--color-slate-400)'
  },
  documentSelectWrapper: {
    minWidth: '220px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    color: 'var(--violet-lighter)'
  },
  select: {
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    background: 'rgba(15, 23, 42, 0.72)',
    color: 'var(--border-subtle)'
  },
  filterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
    flexWrap: 'wrap',
    marginTop: '20px',
    marginBottom: '12px'
  },
  filterColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '200px',
    flex: '1 1 240px'
  },
  filterLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--violet-lighter)'
  },
  typeChips: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  typeChip: {
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    background: 'rgba(15, 23, 42, 0.4)',
    color: 'var(--color-slate-300)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: 600
  },
  typeChipActive: {
    background: 'rgba(96, 165, 250, 0.18)',
    color: 'var(--border-subtle)',
    borderColor: 'rgba(96, 165, 250, 0.4)'
  },
  typeChipIcon: {
    fontSize: '16px'
  },
  typeChipCount: {
    fontSize: '12px',
    color: 'var(--accent-primary-lighter)'
  },
  difficultyChips: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  difficultyChip: {
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    background: 'rgba(15, 23, 42, 0.4)',
    color: 'var(--color-slate-300)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600
  },
  difficultyChipActive: {
    background: 'rgba(52, 211, 153, 0.18)',
    color: 'var(--success-surface)',
    borderColor: 'rgba(52, 211, 153, 0.45)'
  },
  difficultyReset: {
    marginLeft: 'auto',
    padding: '4px 10px',
    borderRadius: '8px',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    background: 'rgba(15, 23, 42, 0.6)',
    color: 'var(--violet-surface)',
    fontSize: '12px',
    cursor: 'pointer'
  },
  limitControl: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  limitInput: {
    width: '120px',
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    background: 'rgba(15, 23, 42, 0.72)',
    color: 'var(--border-subtle)'
  },
  errorBox: {
    marginTop: '12px',
    padding: '12px',
    borderRadius: '12px',
    background: 'rgba(248, 113, 113, 0.2)',
    color: 'var(--danger-lighter)'
  },
  tableWrapper: {
    marginTop: '16px',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    background: 'rgba(15, 23, 42, 0.6)'
  },
  loadingBox: {
    padding: '24px',
    textAlign: 'center',
    color: 'var(--color-slate-300)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    background: 'rgba(30, 41, 59, 0.8)',
    color: 'var(--border-subtle)',
    borderBottom: '1px solid rgba(148, 163, 184, 0.25)'
  },
  tdType: {
    padding: '12px',
    color: 'var(--warning)',
    fontWeight: 700,
    width: '120px'
  },
  tdSource: {
    padding: '12px',
    color: 'var(--color-slate-350)',
    width: '220px'
  },
  tdNote: {
    padding: '12px',
    color: 'var(--border-subtle)',
    width: '220px'
  },
  tdQuestion: {
    padding: '12px',
    color: 'var(--border-subtle)'
  },
  notePreview: {
    marginBottom: '8px',
    fontSize: '13px',
    color: 'var(--color-slate-300)',
    minHeight: '32px'
  },
  noteButton: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    background: 'rgba(30, 64, 175, 0.35)',
    color: 'var(--accent-primary-soft)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600
  },
  exportPanel: {
    marginTop: '24px',
    borderRadius: '16px',
    padding: '20px',
    background: 'rgba(15, 23, 42, 0.65)',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  exportTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700
  },
  exportHint: {
    margin: 0,
    color: 'var(--color-slate-400)',
    fontSize: '13px'
  },
  exportCounts: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '16px'
  },
  exportCountItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  exportLabel: {
    fontSize: '13px',
    color: 'var(--color-slate-300)'
  },
  exportInput: {
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    background: 'rgba(15, 23, 42, 0.7)',
    color: 'var(--border-subtle)'
  },
  exportMax: {
    fontSize: '12px',
    color: 'var(--color-slate-400)'
  },
  exportFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap'
  },
  exportToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--color-slate-300)'
  },
  exportSummary: {
    color: 'var(--accent-primary-lighter)',
    fontWeight: 700
  },
  exportButton: {
    padding: '12px 24px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--indigo) 0%, var(--violet) 100%)',
    color: 'var(--text-on-accent)',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 16px 32px rgba(99, 102, 241, 0.35)'
  },
  exportButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  historyPanel: {
    marginTop: '24px',
    borderRadius: '16px',
    padding: '20px',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(148, 163, 184, 0.28)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  historyHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
  },
  historyTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700
  },
  historyRefresh: {
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(96, 165, 250, 0.45)',
    background: 'rgba(59, 130, 246, 0.18)',
    color: 'var(--accent-primary-soft)',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: 600
  },
  historyList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  historyItem: {
    padding: '12px 14px',
    borderRadius: '12px',
    background: 'rgba(15, 23, 42, 0.55)',
    border: '1px solid rgba(148, 163, 184, 0.25)'
  },
  historyMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    fontSize: '12px',
    color: 'var(--violet-lighter)',
    marginBottom: '6px'
  },
  historyCounts: {
    fontSize: '13px',
    color: 'var(--border-subtle)'
  },
  historyEmpty: {
    padding: '20px',
    borderRadius: '12px',
    background: 'rgba(59, 130, 246, 0.12)',
    color: 'var(--accent-primary-soft)',
    fontSize: '13px'
  },
  noteBackdrop: {
    position: 'fixed',
    left: 0,
    top: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(15, 23, 42, 0.72)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px'
  },
  noteModal: {
    width: '100%',
    maxWidth: '480px',
    borderRadius: '16px',
    background: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    boxShadow: '0 24px 48px rgba(15, 23, 42, 0.45)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    color: 'var(--border-subtle)'
  },
  noteTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700
  },
  noteTextarea: {
    minHeight: '140px',
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    background: 'rgba(15, 23, 42, 0.7)',
    color: 'var(--border-subtle)',
    padding: '12px',
    fontSize: '14px',
    resize: 'vertical'
  },
  noteMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: 'var(--violet-lighter)'
  },
  noteError: {
    color: 'var(--danger-lighter)'
  },
  noteActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px'
  },
  noteCancel: {
    padding: '10px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    background: 'transparent',
    color: 'var(--border-subtle)',
    cursor: 'pointer'
  },
  noteSave: {
    padding: '10px 18px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--info-soft) 0%, var(--accent-primary-strong) 100%)',
    color: 'var(--surface-soft-solid)',
    cursor: 'pointer',
    fontWeight: 700
  }
};

export default ProblemLibrary;
