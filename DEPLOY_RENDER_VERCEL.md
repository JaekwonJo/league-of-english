## Render + Vercel 자동 배포 설정 (5분 컷)

이 문서 그대로 따라 하면, `main`에 푸시될 때마다 자동으로:

- GitHub Actions가 테스트를 돌리고
- Render(API 서버)에 배포 Hook을 호출하고
- Vercel(프런트)을 프로덕션으로 배포합니다.

---

### 0) 사전 확인

- Render에 API 서비스가 이미 연결되어 있어야 합니다.
- Vercel에 클라이언트(React) 프로젝트가 연결되어 있어야 합니다.

---

### 1) GitHub Actions 시크릿/변수 등록

GitHub → 리포지토리(league-of-english) → Settings → Secrets and variables → Actions

1) New repository secret 추가

- `RENDER_DEPLOY_HOOK_URL` → Render 대시보드 → 서비스(API) → Settings → Deploy Hooks에서 복사
- `VERCEL_TOKEN` → https://vercel.com/account/tokens 에서 생성한 토큰
- `VERCEL_ORG_ID` → Vercel 프로젝트 → Settings → General → “Team ID / Org ID”
- `VERCEL_PROJECT_ID` → Vercel 프로젝트 → Settings → General → “Project ID”

2) (선택) Repository variables

- `RENDER_DEPLOY_HOOK_URL`을 깃헙 변수로도 추가하면 시크릿 대신 변수로도 읽을 수 있습니다.

이미 리포에는 `.github/workflows/ci.yml`가 준비되어 있어, 위 값만 넣으면 main 푸시 시 자동으로 Render/Vercel 배포를 수행합니다.

---

### 2) Render 설정 (API)

- Environment → `JWT_SECRET`, `OPENAI_API_KEY`, `DB_FILE=/var/data/loe.db`, `CORS_ORIGIN=https://league-of-english.com,https://www.league-of-english.com`
- Build Command: `npm ci` (추천: 프런트 빌드는 Vercel에서 수행)
- Start Command: `npm start`

자동 배포(Repository → Auto-Deploy ON)를 켜면, GitHub Actions를 쓰지 않아도 main 푸시 시 배포됩니다. 다만, CI 테스트를 통과한 빌드만 배포하고 싶으면 Actions Hook을 쓰는 것이 더 안전합니다.

---

### 3) Vercel 설정 (프런트)

- Git 연동: Settings → Git → “Automatically deploy your Git commits” ON
- Production Branch: `main`
- Environment Variables: `REACT_APP_API_URL=https://loe-server.onrender.com/api`

GitHub Actions를 켰다면, `VERCEL_*` 시크릿을 이용해 main 푸시 시 프로덕션 배포가 자동으로 일어납니다.

---

### 4) 동작 확인

1) README 상단 배지를 참고하거나, GitHub → Actions 탭에서 CI가 초록색으로 끝나는지 확인합니다.
2) Render 대시보드에서 새 배포가 시작되는지(Deploys 탭) 확인합니다.
3) Vercel 대시보드에서 Production Deployment가 생성되는지 확인합니다.

---

### 5) 문제 해결 팁

- Render 빌드 실패: 콘솔의 “Syntax error” 위치를 확인 후 커밋/푸시 → 다시 Hook 호출로 해결됩니다.
- Vercel 404: 클라이언트 라우팅 시 `homepage` 설정 불필요(CRA). 프리뷰/프로덕션 도메인 확인.
- CORS 오류: Render 환경변수 `CORS_ORIGIN`에 도메인을 콤마로 모두 추가(https://league-of-english.com, https://www.league-of-english.com).

필요 시 원격으로 로그를 함께 보며 조정해 드리겠습니다.

