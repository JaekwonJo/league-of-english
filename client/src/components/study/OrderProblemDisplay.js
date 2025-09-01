/**
 * 순서배열 문제 전용 컴포넌트
 */

import React from 'react';
import { orderStyles } from './problemDisplayStyles';

const OrderProblemDisplay = ({ problem, parsedOrderData }) => {
  return (
    <>
      {/* 순서배열 문제용 특별 헤더 - 분리된 섹션들 */}
      {(problem.metadata || parsedOrderData?.metadata) && (
        <>
          <div style={orderStyles.orderTitleSection}>
            📚 제목: {(problem.metadata?.originalTitle || parsedOrderData?.metadata.originalTitle)}
          </div>
          <div style={orderStyles.orderNumberSection}>
            📄 문제번호: {(problem.metadata?.passageNumber || parsedOrderData?.metadata.passageNumber)}
          </div>
          <div style={orderStyles.orderSourceSection}>
            📍 출처: {(problem.metadata?.source || parsedOrderData?.metadata.source)}
          </div>
        </>
      )}
      
      {/* 순서배열 문제 지시문 */}
      <div style={orderStyles.orderInstruction}>
        ✨ Q. 주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.
      </div>


      {/* 순서배열 주어진 문장 */}
      <div style={orderStyles.orderGivenContainer}>
        <div style={orderStyles.givenLabel}>🎯 [주어진 문장]</div>
        <div style={orderStyles.orderGivenText}>
          {problem.mainText || parsedOrderData?.mainText || '데이터 없음: 확인 중...'}
        </div>
      </div>

      {/* 순서배열 선택지 */}
      <div style={{ marginBottom: '20px' }}>
        <div style={orderStyles.sentencesLabel}>📝 [선택지]</div>
        {(problem.sentences || parsedOrderData?.sentences || [
          {label: 'A', text: '데이터 없음 A'},
          {label: 'B', text: '데이터 없음 B'},
          {label: 'C', text: '데이터 없음 C'}
        ]).map((sent, idx) => (
          <div key={idx} style={orderStyles.orderSentence}>
            <strong>{sent.label}.</strong> {sent.text}
          </div>
        ))}
      </div>
    </>
  );
};

export default OrderProblemDisplay;