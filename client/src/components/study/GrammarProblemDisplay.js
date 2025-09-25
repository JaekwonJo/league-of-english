import React, { useState, useEffect } from "react";
import { orderStyles } from "./problemDisplayStyles";

const underlineStyle = {
  textDecoration: "underline",
  textDecorationColor: "#fbbf24",
  textDecorationThickness: "3px",
  fontWeight: "bold",
  backgroundColor: "rgba(251, 191, 36, 0.2)",
  padding: "2px 4px",
  borderRadius: "4px",
  color: "inherit"
};

const parseAnswerValue = (value) => {
  if (value === null || value === undefined) return [];
  return String(value)
    .replace(/[[\]{}\\]/g, "")
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((token) => parseInt(token, 10))
    .filter((num) => Number.isInteger(num));
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
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          borderColor: "#10b981",
          color: "white"
        };
      }
      if (selectedSet.has(choiceNumber) && !correctSet.has(choiceNumber)) {
        return {
          ...baseStyle,
          background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
          borderColor: "#dc2626",
          color: "white"
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

  const rawChoices = problem.choices || problem.options || problem.multipleChoices || [];
  const choiceList = Array.isArray(rawChoices) ? rawChoices.map(normalizeChoice).filter(Boolean) : [];

  const selectionLabel = isMultiSelect
    ? "Select every option that is grammatically correct."
    : "Select the option that is grammatically incorrect.";

  const correctString = correctAnswers.length ? correctAnswers.join(",") : "";
  const isCorrectSelection =
    selected.length > 0 &&
    selected.length === correctAnswers.length &&
    selected.every((value, idx) => value === correctAnswers[idx]);

  const sourceLabel = problem.sourceLabel || problem.source;
  const questionText = problem.question || (isMultiSelect
    ? "Q. Select all of the sentences that are grammatically correct."
    : "Q. Select the sentence that is grammatically incorrect.");

  return (
    <>
      {sourceLabel && (
        <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "10px", fontStyle: "italic" }}>
          Source: {sourceLabel}
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
          <div style={{ color: "#dc2626", padding: "12px 0" }}>
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
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
              color: "white"
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