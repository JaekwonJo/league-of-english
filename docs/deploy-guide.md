# 베타 배포 가이드 (Render + Vercel)

## 1. 사전 준비
- GitHub 저장소가 최신 상태인지 확인합니다 (`git status`).
- `.env.example`를 참고하여 루트에 `.env` 파일을 만들고 필수 값을 채워 둡니다.
  ```bash
  cp .env.example .env
  # OPENAI_API_KEY, JWT_SECRET 등을 입력
  ```
- **이메일 인증을 사용하려면** `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `ADMIN_ALERT_EMAIL` 값도 함께 입력하세요. (Gmail은 앱 비밀번호 필요)
- 로컬에서 다음 명령으로 최소 한 번 빌드/테스트를 통과해야 합니다.
  ```bash
  npm install
  npm run build
  npm test
  ```

## 2. Render (서버 API) 배포
1. Render 대시보드에서 **New +** → **Web Service**를 선택하고 GitHub 저장소를 연결합니다.
2. 기본 설정
   - **Name**: 원하는 서비스 이름 (예: `loe-api-beta`)
   - **Region**: Singapore (ap-southeast) 권장
   - **Branch**: `main`
   - **Build Command**: `npm install && npm install --prefix client && npm run build`
   - **Start Command**: `npm run start`
3. **Environment**를 `Node`로 설정하고, **Instance Type**은 Starter 이상을 선택합니다.
4. **Environment Variables** 탭에 다음 값을 추가합니다.
   | KEY | VALUE |
   | --- | --- |
   | `OPENAI_API_KEY` | 실제 OpenAI API 키 |
   | `JWT_SECRET` | 충분히 긴 비밀 문자열 |
   | `PORT` | `5000` |
   | `EMAIL_SERVICE` | `gmail` (또는 사용하는 SMTP 서비스) |
   | `EMAIL_USER` | 인증 메일을 발송할 이메일 주소 |
   | `EMAIL_PASS` | 이메일 서비스용 비밀번호(앱 비밀번호) |
   | `EMAIL_FROM` | 발신자 이름/주소 (예: `League of English <no-reply@loe.com>`) |
   | `ADMIN_ALERT_EMAIL` | 입금 확인 안내를 받을 관리자 이메일 |
5. 배포를 시작합니다. 첫 배포는 몇 분이 걸릴 수 있습니다.
6. 배포가 완료되면 Render가 제공하는 도메인을 확인하세요. (`https://<app>.onrender.com`)
7. 헬스 체크:
   ```bash
   curl https://<app>.onrender.com/api/health
   ```

### 데이터베이스 (SQL.js) 백업
- 현재는 파일 기반 DB(`server/database.db`)를 사용하므로, 베타 환경에서는 **새로운 빈 DB**로 시작하는 것이 안전합니다.
- 필요 시 로컬 파일을 Render의 Persistent Disk로 업로드할 수 있도록 Render의 Disk 기능을 설정하세요. (Starter 플랜 이상 권장)

## 3. Vercel (React 클라이언트) 배포
1. Vercel 대시보드에서 **New Project** → GitHub 저장소를 선택합니다.
2. **Framework Preset**은 `Create React App`을 자동으로 감지합니다.
3. **Environment Variables**에 다음 값을 추가합니다.
   | KEY | VALUE |
   | --- | --- |
   | `REACT_APP_API_URL` | Render에서 발급된 API 주소 + `/api` (예: `https://loe-api-beta.onrender.com/api`) |
4. 빌드 설정은 기본값으로 두고 **Deploy**를 클릭합니다.
5. 최초 배포가 완료되면 제공된 도메인(예: `https://loe-beta.vercel.app`)을 확인하세요.

## 4. 베타 운영 체크리스트
- [ ] Render API와 Vercel 클라이언트 주소를 `.env` 및 관리자 설정에 반영했나요?
- [ ] 학생 계정/교사 계정으로 실제 로그인 테스트를 해봤나요?
- [ ] 분석본 생성, 추천/신고, 문제 출제 등 핵심 기능이 동작하는지 확인했나요?
- [ ] 무료 플랜 제한(분석본 10개)과 관리자 알림이 정상 작동하나요?
- [ ] 긴급 상황을 대비한 롤백 플랜(이전 버전 태그, DB 백업)이 준비돼 있나요?

## 5. 유용한 npm 스크립트
- `npm run build`: 클라이언트(React) 빌드
- `npm run dev:all`: 로컬에서 API + 클라이언트 동시 실행
- `npm run start`: 프로덕션 모드 서버 실행

## 6. 문제 해결
- Render 빌드 실패: 로그에서 `npm` 설치 오류가 보이면 Node 버전과 캐시를 확인하세요 (`Environment → Add Build Command: npm run build`).
- Vercel 배포 실패: `npm test`가 자동으로 실행되므로, 테스트를 임시로 끄려면 `vercel.json`에서 `ignoreCommand`를 설정할 수 있습니다. (권장하지 않음)
- OpenAI 오류: Render 환경 변수에 올바른 키가 들어있는지와 일일 사용량 제한을 확인하세요.

이제 체크리스트에 따라 진행하면 1주 안에 베타 서비스를 안정적으로 공개할 수 있습니다. 🚀
