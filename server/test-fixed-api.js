const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NzE1MTQ4MCwiZXhwIjoxNzU3NzU2MjgwfQ.peyChJ3C3NiIg7cMwnuCaTpQnQuflHdy-nUEhs14BTw';

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/documents/41',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, (res) => {
  console.log(`📡 상태 코드: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('\n✅ API 응답:');
      console.log('success:', parsed.success);
      console.log('data 존재:', parsed.data ? '있음' : '없음');
      
      if (parsed.data) {
        console.log('문서 ID:', parsed.data.id);
        console.log('제목:', parsed.data.title);
        console.log('content 길이:', parsed.data.content ? parsed.data.content.length : 0);
        
        // content 파싱 테스트
        if (parsed.data.content) {
          try {
            const contentParsed = JSON.parse(parsed.data.content);
            console.log('passages 개수:', contentParsed.passages ? contentParsed.passages.length : 0);
            console.log('\n✅ 이제 개별 지문 분석이 가능합니다!');
          } catch (e) {
            console.log('content 파싱 실패:', e.message);
          }
        }
      }
    } catch (e) {
      console.error('응답 파싱 실패:', e.message);
      console.log('원본 응답:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ 요청 실패: ${e.message}`);
});

req.end();