// 문자열 인코딩 복구 유틸리티
// UTF-8 문자열이 Latin-1(ISO-8859-1)로 잘못 해석되어 깨진 경우를 복구합니다.

export function fixMojibake(str) {
  if (!str) return '';
  try {
    // 1. 먼저 Latin-1로 인코딩된 것으로 가정하고 바이트로 복원
    // 2. 복원된 바이트를 다시 UTF-8로 디코딩
    return decodeURIComponent(escape(str));
  } catch (e) {
    // 복구 실패 시 원본 반환
    return str;
  }
}

export function cleanExamTitle(title) {
  // 파일명에서 확장자 제거 및 깨진 문자 복구 시도
  let cleaned = title.replace(/\.pdf$/i, '');
  cleaned = fixMojibake(cleaned);
  // 너무 길면 자르기
  if (cleaned.length > 20) {
    return cleaned.substring(0, 20) + '...';
  }
  return cleaned;
}
