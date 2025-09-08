import React, { useState, useEffect } from 'react';
import OrderProblemDisplay from './OrderProblemDisplay';
import InsertionProblemDisplay from './InsertionProblemDisplay';
import GrammarProblemDisplay from './GrammarProblemDisplay';
import { problemDisplayStyles, orderStyles } from './problemDisplayStyles';

const ProblemDisplay = ({
  problem,
  currentIndex,
  totalProblems,
  userAnswer,
  onAnswer,
  onNext,
  onPrev,
  onFinish,
  timeElapsed
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState(userAnswer || '');

  useEffect(() => {
    setSelectedAnswer(userAnswer || '');
  }, [userAnswer, currentIndex]);

  const handleSelect = (answer) => {
    setSelectedAnswer(answer);
    onAnswer(answer);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!problem) return null;

  let parsedOrderData = null;
  return (
    <div style={problemDisplayStyles.container}>
      <div style={problemDisplayStyles.header}>
        <div style={problemDisplayStyles.progress}>
          문제 {currentIndex + 1} / {totalProblems}
        </div>
        <div style={problemDisplayStyles.timer}>
          ⏱️ {formatTime(timeElapsed)}
        </div>
      </div>

      <div style={{
        ...problemDisplayStyles.problemCard,
        ...(problem.type === 'order' ? orderStyles.orderProblemCard : {})
      }}>
        {/* 순서배열 문제 */}
        {problem.type === 'order' && (
          <OrderProblemDisplay
            problem={problem}
            parsedOrderData={parsedOrderData}
            onAnswer={handleSelect}
            userAnswer={selectedAnswer}
          />
        )}

        {/* 문장 삽입 문제 */}
        {problem.type === 'insertion' && (
          <InsertionProblemDisplay
            problem={problem}
            onAnswer={handleSelect}
            userAnswer={selectedAnswer}
          />
        )}

        {/* 문법 문제 */}
        {(problem.type === 'grammar' || problem.type === 'grammar_count') && (
          <GrammarProblemDisplay
            problem={problem}
            onAnswer={handleSelect}
            userAnswer={selectedAnswer}
            showResult={false}
          />
        )}

        {/* 일반 문제 */}
        {problem.type !== 'order' && problem.type !== 'insertion' && problem.type !== 'grammar' && (
          <>
            <div style={problemDisplayStyles.instruction}>
              {problem.instruction || problem.question}
            </div>

            {problem.mainText && (
              <div style={problemDisplayStyles.mainText}>{problem.mainText}</div>
            )}

            {problem.sentenceToInsert && (
              <div style={problemDisplayStyles.insertText}>
                [삽입할 문장] {problem.sentenceToInsert}
              </div>
            )}

            {problem.sentences && (
              <div style={problemDisplayStyles.sentences}>
                <div style={orderStyles.sentencesLabel}>아래 [선택지]</div>
                {problem.sentences.map((sent, idx) => (
                  <div key={idx} style={problemDisplayStyles.sentence}>
                    <strong>{sent.label}.</strong> {sent.text}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div style={problemDisplayStyles.options}>
          {(problem.options || []).map((option, idx) => (
            <button
              key={idx}
              style={{
                ...problemDisplayStyles.optionButton,
                ...(problem.type === 'order' ? orderStyles.orderOptionButton : {}),
                ...(selectedAnswer === (idx + 1).toString() ? {
                  ...problemDisplayStyles.selected,
                  ...(problem.type === 'order' ? orderStyles.orderSelected : {})
                } : {})
              }}
              onClick={() => handleSelect((idx + 1).toString())}
              onMouseEnter={(e) => {
                if (problem.type === 'order' && selectedAnswer !== (idx + 1).toString()) {
                  e.target.style.transform = 'translateY(-2px) scale(1.02)';
                  e.target.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (problem.type === 'order' && selectedAnswer !== (idx + 1).toString()) {
                  e.target.style.transform = 'translateY(0) scale(1)';
                  e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                }
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div style={problemDisplayStyles.navigation}>
        <button
          style={problemDisplayStyles.navButton}
          onClick={onPrev}
          disabled={currentIndex === 0}
        >
          이전
        </button>

        {currentIndex === totalProblems - 1 ? (
          <button
            style={problemDisplayStyles.finishButton}
            onClick={onFinish}
            disabled={!selectedAnswer}
          >
            제출하기
          </button>
        ) : (
          <button
            style={problemDisplayStyles.nextButton}
            onClick={onNext}
            disabled={!selectedAnswer}
          >
            다음
          </button>
        )}
      </div>
    </div>
  );
};

export default ProblemDisplay;

