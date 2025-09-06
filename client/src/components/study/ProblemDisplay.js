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

  // 디버깅용 로그 및 순서배열 문제 파싱
  let parsedOrderData = null;
  if (problem.type === 'order') {
    console.log('🔍 Order Problem Data:', problem);
    console.log('📊 mainText:', problem.mainText);
    console.log('📊 sentences:', problem.sentences);
    console.log('📊 metadata:', problem.metadata);
    
    // 구조화되지 않은 텍스트인 경우 파싱
    if (problem.question && !problem.metadata) {
      const text = problem.question;
      const titleMatch = text.match(/📚 제목: (.+)/);
      const numberMatch = text.match(/📄 문제번호: (.+)/);
      const sourceMatch = text.match(/📍 출처: (.+)/);
      const givenMatch = text.match(/🎯 \[주어진 문장\]\s*\n\s*(.+?)(?=\n\n📝|\n📝)/s);
      const choicesMatch = text.match(/📝 \[선택지\]\s*\n([\s\S]+?)(?=\n\n|$)/);
      
      console.log('🔍 Parsing matches:');
      console.log('titleMatch:', titleMatch);
      console.log('numberMatch:', numberMatch);
      console.log('sourceMatch:', sourceMatch);
      console.log('givenMatch:', givenMatch);
      console.log('choicesMatch:', choicesMatch);
      
      if (titleMatch && numberMatch && sourceMatch && givenMatch && choicesMatch) {
        const choiceLines = choicesMatch[1].split('\n').filter(line => line.trim());
        console.log('📝 Choice lines:', choiceLines);
        
        const sentences = choiceLines.map(line => {
          const match = line.match(/^\s*([A-E])\.\s*(.+)$/);
          return match ? { label: match[1], text: match[2].trim() } : null;
        }).filter(Boolean);
        
        parsedOrderData = {
          metadata: {
            originalTitle: titleMatch[1].trim(),
            passageNumber: numberMatch[1].trim(),
            source: sourceMatch[1].trim()
          },
          mainText: givenMatch[1].trim(),
          sentences: sentences
        };
        
        console.log('🔧 Parsed Order Data:', parsedOrderData);
      } else {
        console.log('❌ 파싱 실패 - 일부 매칭이 실패했습니다');
      }
    }
  }

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

        {/* 문장삽입 문제 */}
        {problem.type === 'insertion' && (
          <InsertionProblemDisplay 
            problem={problem}
            onAnswer={handleSelect}
            userAnswer={selectedAnswer}
          />
        )}

        {/* 어법 문제 */}
        {problem.type === 'grammar' && (
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
                <div style={orderStyles.sentencesLabel}>📝 [선택지]</div>
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