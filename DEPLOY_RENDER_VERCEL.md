# 베타 배포 가이드 (Render + Vercel)

> 😊 아래 순서를 따라 하면 백엔드(Render)와 프런트엔드(Vercel)를 각각 몇 분 안에 올릴 수 있어요. 헷갈리는 부분은 그대로 복사해 붙이면 됩니다!

## 0. 준비물 체크
- GitHub 저장소: `JaekwonJo/league-of-english`
- Render 계정 + Vercel 계정
- 환경 변수 값
  - `OPENAI_API_KEY` (필수)
  - `JWT_SECRET` (필수, 임의의 긴 문자열 추천)
  - `EMAIL_USER`/`EMAIL_PASS` 같은 메일 발송 정보 (선택)
- 로컬에서 `npm install` / `npm run build`가 통과하는지 확인 (이미 완료 ✅)

---

## 1. Render에서 서버 올리기
1. Render 대시보드 → **New +** → **Blueprint Instance** 선택.
2. GitHub 저장소를 연결하고 루트에 있는 `render.yaml`을 그대로 사용해 주세요.
3. 빌드·시작 명령은 blueprint가 자동으로 채워 줍니다.
   - Build: `npm ci --omit=dev`
   - Start: `node server/server.js`
4. **Environment Variables** 탭에서 아래 값을 설정합니다.
   - `OPENAI_API_KEY` → 본인 키 입력
   - `JWT_SECRET` → 원하는 긴 문자열
   - `DB_FILE` → `/var/data/loe.db` (이미 YAML에 기본값, 확인만 하면 돼요)
   - `NODE_VERSION` → `20` (blueprint 기본값)
   - 필요하면 `CORS_ORIGIN`을 `https://<당신의-vercel-도메인>`으로 추가하세요.
5. **Disk** 설정에서 이름 `data`, 경로 `/var/data`, 용량 1GB가 되어 있는지 체크합니다. (SQLite DB를 영구 보관하는 곳이에요.)
6. Deploy 버튼을 누르면 첫 배포가 시작됩니다. 완료 후 Render가 발급한 URL 예시: `https://loe-server.onrender.com`.
7. 건강 상태 확인: 브라우저에서 `https://<render-url>/api/health`에 접속해 `{ "status": "ok" }`가 나오면 성공입니다.

---

## 2. Vercel에서 프런트 올리기
1. Vercel 대시보드 → **Add New Project** → 위 저장소에서 `client` 디렉터리를 선택합니다.
2. Root directory는 `client`입니다.
3. Build Command: `npm run build`
4. Output Directory: `build`
5. Environment Variables 탭에 `REACT_APP_API_URL`을 추가하고 값으로 Render에서 받은 서버 URL 뒤에 `/api`를 붙입니다.
   - 예: `https://loe-server.onrender.com/api`
6. Deploy를 실행하면 Vercel이 `https://<something>.vercel.app` 주소를 줍니다.

---

## 3. 배포 후 체크리스트
1. **관리자 로그인** → (예시 계정이 있다면) 테스트하거나, 새 계정을 만들어 로그인 흐름을 확인해 주세요.
2. **지문 업로드 → 분석 생성**: 새 분석이나 fallback이 제대로 뜨는지 확인합니다.
3. **분석 삭제 버튼**: 방금 만든 삭제 기능이 실제 서버에서도 동작하는지 클릭 테스트!
4. **학습 화면**: 문제 불러오기, 풀이, 신고/좋아요 버튼을 눌러 반응을 살펴봅니다.
5. Render 로그 탭에서 에러가 없는지, Vercel 로그에서 API 호출이 CORS 에러 없이 성공하는지 확인합니다.

---

## 4. 베타 운영 팁
- **환경 변수 변경**은 Render/Vercel에서 저장 후 재배포해야 적용돼요.
- OpenAI 키가 빠지면 fallback 분석만 동작하니, 키 만료 여부를 수시로 점검해 주세요.
- Vercel에서 새 URL이 발급되면 Render의 `CORS_ORIGIN`도 함께 업데이트해야 합니다.
- SQLite 파일(`/var/data/loe.db`)은 Render 디스크에 저장됩니다. 필요하면 Render의 자동 백업 기능을 켜 두세요.

---

## 5. 더 진행하고 싶다면
- Stripe 등 결제를 붙일 계획이 있다면 Render에 Webhook URL을 추가하고, Vercel 환경 변수도 함께 관리하세요.
- 베타 기간 동안에는 QA 계정을 따로 만들어 실제 학생 데이터와 섞이지 않도록 운영하는 것이 안전해요.

필요한 단계는 여기까지예요! 언제든지 "어디서 막혔어요" 라고 말씀해 주시면, 그 지점부터 다시 도와드릴게요. 😊
