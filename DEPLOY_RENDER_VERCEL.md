# Deploy: Render (Server) + Vercel (Client)

빠르게 실서비스로 올릴 때 쓰는 공식 가이드입니다. **Render Starter 플랜 + 디스크**를 기본으로 사용해요.

## 0) 사전 준비
- GitHub 저장소 연결: JaekwonJo/league-of-english
- OPENAI_API_KEY 준비

## 1) Render 서버 배포 (Starter 플랜)
1. Render ? New ? Blueprint ? 이 저장소를 선택해요.
2. 루트에 있는 ender.yaml이 자동으로 감지돼요. Starter 플랜 웹서비스가 바로 구성됩니다.
3. 환경 변수 확인/추가:
   - OPENAI_API_KEY: 본인 키 입력
   - JWT_SECRET: blueprint가 자동 생성 (필요하면 직접 지정)
   - DB_FILE: /var/data/loe.db (이미 blueprint에 포함)
4. Disk 블록이 /var/data에 1GB로 붙어요. 덕분에 SQLite(DB)가 재시작 후에도 살아남습니다.
5. 첫 배포 완료 후 서비스 URL(예: https://loe-server.onrender.com)을 기록해주세요.

?? 헬스체크: GET https://<render-url>/health ? { status: 'OK' }

## 2) Vercel 클라이언트 배포
1. GitHub 프로젝트를 가져와요.
2. Root Directory: client
3. Build Command: 
pm run build
4. Output Directory: uild
5. Environment Variables:
   - REACT_APP_API_URL = https://<render-service-domain>/api
6. Deploy를 누르면 최신 클라이언트가 Render API를 바라봅니다.

## 3) 전체 플로우 점검
1. Vercel URL에 접속해요.
2. 로그인: dmin / admin123
3. 문서 선택 ? 3개 정도 문제 생성 ? 제출 ? 결과 화면에서 점수/티어 확인.

## 4) 운영 팁
- 커스텀 도메인이 있다면 Render와 Vercel 각각에 연결하고, REACT_APP_API_URL도 바꿔 주세요.
- CORS를 잠그고 싶다면 Render에 CORS_ORIGIN(쉼표 구분) 환경 변수를 추가해요.

## 참고: Free 플랜으로 빠른 데모가 필요할 때
- 데이터 유지가 중요하지 않은 데모라면, plan: free + DB_FILE=/tmp/loe.db + 디스크 제거 형태로 별도 YAML을 만들어 사용할 수 있어요.
- 하지만 통계/로그를 모으려면 Starter 이상 플랜을 강력 추천합니다.
