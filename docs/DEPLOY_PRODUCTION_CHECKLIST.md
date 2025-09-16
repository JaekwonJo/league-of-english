# 운영 배포 체크리스트 (아주 쉽게)

이 체크리스트만 따라 하면, “데이터가 저장되는” 실제 서비스가 됩니다. 😊

## 1) 서버(Render) — 영구 저장 설정
- 플랜: Render ‘Starter’로 업그레이드 (무료 → Starter)
- 디스크: 프로젝트에 디스크 추가 (예: 1GB), 마운트 경로 `/var/data`
- 환경변수:
  - `OPENAI_API_KEY`: OpenAI 키 (반드시 설정)
  - `JWT_SECRET`: 자동 생성(또는 직접 넣기)
  - `DB_FILE`: `/var/data/loe.db` (디스크에 저장되도록)
  - `NODE_ENV`: `production`
  - `NODE_VERSION`: `20`
- 블루프린트: `render.starter.yaml` 파일을 사용하면 자동으로 위 구성이 적용됩니다.

확인: 배포 후 `https://<your-render-domain>/health` 가 `{ status: 'OK' }` 이면 성공! ✅

## 2) 클라이언트(Vercel)
- 프로젝트 임포트: GitHub → Vercel
- 루트 디렉토리: `client`
- Build: `npm run build`, Output: `build`
- 환경변수: `REACT_APP_API_URL = https://<your-render-domain>/api`
- 배포 후 접속 테스트: 로그인(기본 관리자), 문항 생성/풀이 흐름 점검

## 3) 도메인 & CORS (선택)
- 커스텀 도메인이 있다면: Vercel(클라)와 Render(서버)에 각각 연결
- 서버 CORS 제한: 필요 시 `CORS_ORIGIN`에 Vercel 도메인 지정

## 4) 보안/운영 팁
- `.env`(특히 `OPENAI_API_KEY`)는 깃에 커밋하지 않기 (`.gitignore` 이미 포함)
- 키가 깃 기록에 올라갔다면: 키 재발급(회전) 권장
- 백업: 주기적으로 `/var/data/loe.db`를 다운받아 백업(Starter 디스크는 영구 저장이지만, 백업은 언제나 안전합니다)

## 5) 빠른 점검 순서
1) Render Starter + 디스크 연결 + 환경변수 설정 → 재배포
2) `/health` OK 확인
3) Vercel에 `REACT_APP_API_URL` 설정 후 배포
4) 실제 로그인/생성/풀이/제출 → 결과 페이지 확인(점수/티어)

축하해요! 이제 진짜 “운영되는 사이트(데이터가 남는)”가 되었어요. 🎉

