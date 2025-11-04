import React, { useState, useEffect, useMemo } from "react";
import { CIRCLED_DIGITS } from "../utils/textFormatters";
import { orderStyles, problemDisplayStyles } from "../problemDisplayStyles";

const underlineStyle = problemDisplayStyles.underlineSpan;

const parseAnswerValue = (value) => {
  if (value === null || value === undefined) return [];
  const parsed = String(value)
    .replace(/[[\]{}\\]/g, "")
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((token) => parseInt(token, 10))
    .filter((num) => Number.isInteger(num));
  return Array.from(new Set(parsed)).sort((a, b) => a - b);
};

const renderTextWithUnderline = (input) => {
  if (!input) return null;
  let str = String(input);
  str = str.replace(/<<\s*(\d+)\s*>>/g, "<u>").replace(/<\/\s*(\d+)\s*>>/g, "</u>");

  const tokens = str.split(/(<\/?u>)/i);
  if (tokens.length === 1) {
    return <>{str}</>;
  }

  const elements = [];
  let underline = false;

  tokens.forEach((token, idx) => {
    const lower = token.toLowerCase();
    if (lower === "<u>") {
      underline = true;
      return;
    }
    if (lower === "</u>") {
      underline = false;
      return;
    }
    if (!token) return;
    if (underline) {
      elements.push(
        <span key={`underline-${idx}`} style={underlineStyle}>
          {token}
        </span>
      );
    } else {
      elements.push(<React.Fragment key={`text-${idx}`}>{token}</React.Fragment>);
    }
  });

  if (elements.length === 0) {
    return <>{str}</>;
  }

  return <span style={{ lineHeight: 1.6 }}>{elements}</span>;
};

const GrammarProblemDisplay = ({ problem, onAnswer, userAnswer, showResult }) => {
  const isCountType = problem.type === "grammar_count";
  const isMultiSelect = problem.type === "grammar_multi" || problem?.metadata?.selectionMode === "multi";
  const hasDisplayText = Boolean(problem.text || problem.mainText);

  const [selected, setSelected] = useState(parseAnswerValue(userAnswer));

  useEffect(() => {
    setSelected(parseAnswerValue(userAnswer));
  }, [userAnswer]);

  const metadata = useMemo(() => problem?.metadata || {}, [problem]);
  const answerMode = useMemo(() => {
    if (metadata?.answerMode) {
      return String(metadata.answerMode).toLowerCase();
    }
    const rawQuestion = String(problem?.question || '').trim().toLowerCase();
    if (rawQuestion.includes('옳은') || rawQuestion.includes('correct')) {
      return 'correct';
    }
    return 'incorrect';
  }, [metadata?.answerMode, problem?.question]);

  const targetIncorrect = useMemo(() => {
    const value = metadata?.targetIncorrectCount;
    return Number.isFinite(value) ? value : null;
  }, [metadata?.targetIncorrectCount]);

  const targetCorrect = useMemo(() => {
    const value = metadata?.targetCorrectCount;
    return Number.isFinite(value) ? value : null;
  }, [metadata?.targetCorrectCount]);

  const correctAnswers = parseAnswerValue(problem.correctAnswer ?? problem.answer);
  const selectedSet = new Set(selected);
  const correctSet = new Set(correctAnswers);

  const handleSelect = (choiceNumber) => {
    if (showResult) return;

    if (isMultiSelect) {
      setSelected((prev) => {
        const exists = prev.includes(choiceNumber);
        const next = exists ? prev.filter((value) => value !== choiceNumber) : [...prev, choiceNumber];
        next.sort((a, b) => a - b);
        const answerValue = next.length ? next.join(",") : "";
        onAnswer(answerValue);
        return next;
      });
    } else {
      setSelected([choiceNumber]);
      onAnswer(String(choiceNumber));
    }
  };

  const getChoiceStyle = (choiceNumber) => {
    const baseStyle = { ...orderStyles.multipleChoiceButton, width: "100%" };

    if (showResult) {
      if (correctSet.has(choiceNumber)) {
        return {
          ...baseStyle,
          background: "linear-gradient(135deg, var(--success) 0%, var(--success-strong) 100%)",
          borderColor: "var(--success)",
          color: 'var(--text-on-accent)'
        };
      }
      if (selectedSet.has(choiceNumber) && !correctSet.has(choiceNumber)) {
        return {
          ...baseStyle,
          background: "linear-gradient(135deg, var(--danger-strong) 0%, var(--danger-stronger) 100%)",
          borderColor: "var(--danger-strong)",
          color: 'var(--text-on-accent)'
        };
      }
      return baseStyle;
    }

    if (selectedSet.has(choiceNumber)) {
      return { ...baseStyle, ...orderStyles.multipleChoiceSelected };
    }

    return baseStyle;
  };

  const normalizeChoice = (choice) => {
    if (choice && typeof choice === "object") {
      if (typeof choice.value === "string") return choice.value;
      if (typeof choice.text === "string") return choice.text;
      if (typeof choice.label === "string" && typeof choice.content === "string") {
        return `${choice.label}. ${choice.content}`;
      }
    }
    return String(choice ?? "");
  };

  const parsedSegments = useMemo(() => {
    const sourceText = String(problem.text || problem.mainText || '');
    if (!sourceText) return [];
    const matches = [];
    const regex = /<u>(.*?)<\/u>/gis;
    let match;
    while ((match = regex.exec(sourceText)) !== null) {
      const segment = match[1].replace(/<[^>]+>/g, '').trim();
      if (segment) {
        matches.push(segment);
      }
    }
    return matches;
  }, [problem.text, problem.mainText]);
  const choiceList = useMemo(() => {
    const baseChoices = problem.choices || problem.options || problem.multipleChoices || [];
    const normalized = Array.isArray(baseChoices)
      ? baseChoices.map(normalizeChoice).filter(Boolean)
      : [];

    if (normalized.length > 0) {
      return normalized;
    }
    if (parsedSegments.length) {
      return parsedSegments.map((segment, idx) => `${CIRCLED_DIGITS[idx] || idx + 1} ${segment}`);
    }
    return [];
  }, [problem.choices, problem.options, problem.multipleChoices, parsedSegments]);
  const selectionLabel = useMemo(() => {
    const countLabel = (count) => (Number.isFinite(count) && count > 0 ? `${count}개 모두` : '모두');
    if (answerMode === 'correct') {
      if (isMultiSelect) {
        return `밑줄 친 부분 중, 어법상 옳은 것을 ${countLabel(targetCorrect)} 고르세요.`;
      }
      return '밑줄 친 부분 중, 어법상 옳은 것을 고르세요.';
    }
    if (isMultiSelect) {
      return `밑줄 친 부분 중, 어법상 틀린 것을 ${countLabel(targetIncorrect)} 고르세요.`;
    }
    return '밑줄 친 부분 중, 어법상 틀린 것을 고르세요.';
  }, [answerMode, isMultiSelect, targetCorrect, targetIncorrect]);

  const correctString = correctAnswers.length ? correctAnswers.join(",") : "";
  const isCorrectSelection =
    selected.length > 0 &&
    selected.length === correctAnswers.length &&
    selected.every((value, idx) => value === correctAnswers[idx]);

  const rawSourceLabel = problem.sourceLabel || problem.source;
  const sourceLabel = (() => {
    if (!rawSourceLabel) return '';
    const trimmed = String(rawSourceLabel).trim();
    if (!trimmed) return '';
    const cleaned = trimmed.replace(/^\s*(출처|Source)\s*[:\u2502|]?\s*/iu, '').trim();
    if (!cleaned) return '';
    const hasPrefix = /^\s*(출처|Source)\s*[:\u2502|]?/iu.test(trimmed);
    return hasPrefix ? `출처│${cleaned}` : cleaned;
  })();
  const questionText = problem.question || (
    answerMode === 'correct'
      ? (isMultiSelect
        ? 'Q. 밑줄 친 부분 중, 어법상 옳은 것을 모두 고르시오.'
        : 'Q. 밑줄 친 부분 중, 어법상 옳은 것을 고르시오.')
      : (isMultiSelect
        ? 'Q. 밑줄 친 부분 중, 어법상 틀린 것을 모두 고르시오.'
        : 'Q. 밑줄 친 부분 중, 어법상 틀린 것은?')
  );

  return (
    <>
      {sourceLabel && (
        <div style={{ fontSize: "14px", color: "var(--tone-strong)", marginBottom: "10px", fontStyle: "italic" }}>
          {sourceLabel.startsWith('출처') ? sourceLabel : `출처: ${sourceLabel}`}
        </div>
      )}

      <div style={orderStyles.orderInstruction}>{questionText}</div>

      {hasDisplayText && (
        <div style={{ ...orderStyles.orderGivenText, marginBottom: "20px", whiteSpace: "pre-wrap" }}>
          {renderTextWithUnderline(problem.text || problem.mainText)}
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <div style={orderStyles.sentencesLabel}>{selectionLabel}</div>
        {choiceList.length === 0 ? (
          <div style={{ color: "var(--danger-strong)", padding: "12px 0" }}>
            Options are not available. Please contact the administrator.
          </div>
        ) : (
          choiceList.map((choice, index) => {
            const choiceNumber = index + 1;
            return (
              <button
                key={index}
                style={getChoiceStyle(choiceNumber)}
                onClick={() => handleSelect(choiceNumber)}
              >
                {isCountType ? choice : renderTextWithUnderline(choice)}
              </button>
            );
          })
        )}
      </div>

      {showResult && (
        <div style={{ ...orderStyles.orderGivenContainer, marginTop: "20px" }}>
          <div
            style={{
              ...orderStyles.orderGivenText,
              background: isCorrectSelection
                ? "linear-gradient(135deg, var(--success) 0%, var(--success-strong) 100%)"
                : "linear-gradient(135deg, var(--danger-strong) 0%, var(--danger-stronger) 100%)",
              color: 'var(--text-on-accent)'
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "10px" }}>
              {isCorrectSelection ? "Correct!" : "Check the explanation."}
            </div>
            <div style={{ fontSize: "14px", marginBottom: "12px" }}>
              Answer: {correctString || "N/A"}
            </div>
            {problem.explanation && (
              <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                <strong>Explanation:</strong> {problem.explanation}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default GrammarProblemDisplay;
