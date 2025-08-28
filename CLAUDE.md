# CLAUDE.md

LEAGUE OF ENGLISH - AI 기반 영어 학습 플랫폼 프로젝트

저는 코딩을 아무것도 모르고, 용어도 모릅니다. 

그래서, 설명을 해주실 때 반드시 자세하고 쉽게 진짜 초등학생도 이해할 수 있게 정말 이해하기 쉽게 설명해주세요. 

그리고 무조건 '어디서부터 어디까지 전체 삭제하고, 복사-붙혀넣기 하세요' 처럼 진짜 간단한 방법으로 안내해주세요. 

이모지도 써가면서 보기 쉽게 작성해주세요.
글씨색도 중요한 부분은 색깔 다양하게 하고
형광펜 작업 등 강조해서 눈에 띄게 해주세요

진짜 아무것도 모르는 초보자에게

애플의 GUI의 감성적인 느낌으로 

복사-붙여넣기만으로도 모든것을 가능하게 
프로그램을 만들어주고 

하나하나 쉽고 자세히 설명해주고
이모지도 사용하고 글씨색도 잘 알아볼 수 있게 말투도 친절하게 

모든 용어를 다 설명해주셔야 합니다
웬만한건 통째로 코드를 그냥 전부 다 써주세요.

그리고 지워야할 코드나 복사-붙여넣기 해야할 코드의 앞부분, 뒷부분까지도 다 써서
헷깔리지 않고 알아보기 쉽게 알려주세요.

진짜 A부터 Z까지, 하나부터 열까지. 전부 다 하나하나 설명해주셔야 합니다.
마치, 제가 유치원 아이처럼 하나도 모르기 때문에 전부 쉽고 자세히 설명해주세요. 

Claude 당신과 함께 최고의 앱을 만들고 싶습니다. 

================================================================================
LEAGUE OF ENGLISH - AI 기반 영어 학습 플랫폼 프로젝트 (전체 기획서)
================================================================================
작성일: 2025년 기준
버전: 2.0 (워크시트메이커 지원 + 전체 기획서 통합)

【목차】
1. 프로젝트 개요
2. 시스템 아키텍처
3. 사용자 구조 및 권한
4. 데이터베이스 설계
5. 문서 관리 시스템
6. 문제 생성 시스템
7. 단어 시험 시스템
8. 학습 시스템
9. 게이미피케이션
10. 결제 및 멤버십
11. UI/UX 상세 스펙
12. API 명세서
13. 보안 및 성능
14. 배포 및 운영
15. 비즈니스 모델
16. 현재 진행 상황 및 로드맵

================================================================================
【1. 프로젝트 개요】
================================================================================

1.1 프로젝트 정의
- 이름: League of English (LoE)
- 슬로건: "AI가 만드는 무한 영어 문제"
- 타겟: 대한민국 고등학생 (1~3학년)
- 목적: AI 기반 맞춤형 영어 학습 플랫폼

1.2 핵심 가치
- 무한 콘텐츠: AI가 생성하는 끝없는 문제
- 맞춤형 학습: 개인별 수준/취약점 분석
- 게이미피케이션: 랭크 시스템으로 동기부여
- 접근성: 무료/유료 차별화된 서비스

1.3 기술 스택
Frontend: React 18, Tailwind CSS, Lucide Icons
Backend: Node.js, Express.js
Database: SQLite (초기) → PostgreSQL (확장)
AI: OpenAI GPT-4 API
Hosting: Vercel (Frontend), Railway (Backend)
Storage: Cloudflare R2 (문서)
파일파싱: pdf-parse (PDF 지원)

1.4 프로젝트 구조
league-of-english/
├── client/          # React 프론트엔드
│   ├── public/
│   └── src/
│       └── App.js   # 메인 컴포넌트 (모든 페이지 포함)
├── server/          # Express 백엔드
│   ├── server.js    # 메인 서버 파일
│   ├── database.db  # SQLite 데이터베이스
│   └── uploads/     # 업로드된 문서 임시 저장
└── docs/           # 문서

================================================================================
【2. 시스템 아키텍처】
================================================================================

2.1 전체 구조
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │────▶│   API Server    │────▶│    Database     │
│   (React SPA)   │     │   (Express.js)  │     │    (SQLite)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                          │
                               ▼                          ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   OpenAI API    │     │  File Storage   │
                        │    (GPT-4)      │     │  (Cloudflare)   │
                        └─────────────────┘     └─────────────────┘

2.2 데이터 플로우
- 문서 업로드: 관리자 → 문서 업로드 → 파일 검증 → 텍스트 추출 → DB 저장 → 카테고리 분류
- 문제 생성: 학생 요청 → 문서 선택 → AI 생성/DB 조회 → 문제 조합 → 응답
- 학습 플로우: 문제 표시 → 답안 제출 → 채점 → 통계 업데이트 → 다음 문제

================================================================================
【3. 사용자 구조 및 권한】
================================================================================

3.1 사용자 타입

3.1.1 학생 (Student)
무료 회원:
- 일일 30문제 제한
- DB 저장 문제만 접근
- 기본 통계만 제공
- 광고 표시

유료 회원 (프리미엄):
- 무제한 문제
- AI 생성 문제 접근
- 상세 통계/분석
- 광고 제거
- 오답노트 자동 생성
- 단어장 무제한

3.1.2 교사 (Teacher)
- 소속 학교 학생 관리
- 학급별 문서 업로드
- 학생 진도 확인
- 과제 부여 기능
- 성적 통계 열람

3.1.3 관리자 (Admin)
- 전체 시스템 관리
- 문서/카테고리 관리
- 사용자 관리
- 결제 관리
- 통계 대시보드

3.2 권한 매트릭스
┌─────────────────┬──────────┬──────────┬──────┬──────────┐
│      기능       │ 무료학생 │ 유료학생 │ 교사 │  관리자  │
├─────────────────┼──────────┼──────────┼──────┼──────────┤
│ 문제 풀기 (DB)  │ ✓(30개/일)│ ✓(무제한) │  ✓   │    ✓     │
│ 문제 풀기 (AI)  │    ✗     │    ✓     │  ✓   │    ✓     │
│ 단어 시험       │ ✓(10개/일)│ ✓(무제한) │  ✓   │    ✓     │
│ 문서 업로드     │    ✗     │    ✗     │  ✓   │    ✓     │
│ 카테고리 관리   │    ✗     │    ✗     │  △   │    ✓     │
│ 사용자 관리     │    ✗     │    ✗     │  △   │    ✓     │
└─────────────────┴──────────┴──────────┴──────┴──────────┘

================================================================================
【4. 데이터베이스 설계】
================================================================================

4.1 주요 테이블 구조

4.1.1 users (사용자)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    school VARCHAR(100) NOT NULL,
    grade INTEGER NOT NULL CHECK (grade IN (1, 2, 3)),
    role VARCHAR(20) DEFAULT 'student',
    membership VARCHAR(20) DEFAULT 'free',
    membership_expires_at DATETIME,
    daily_limit INTEGER DEFAULT 30,
    used_today INTEGER DEFAULT 0,
    last_reset_date DATE,
    tier VARCHAR(20) DEFAULT 'Bronze',
    points INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

4.1.2 documents (문서)
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'worksheet', 'mocktest', 'textbook'
    category_id INTEGER,
    school VARCHAR(100) DEFAULT '전체',
    grade INTEGER,
    difficulty VARCHAR(20) DEFAULT 'medium',
    worksheet_type VARCHAR(20), -- 'day', 'page' (워크시트메이커용)
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

4.1.3 problems (문제)
CREATE TABLE problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER,
    type VARCHAR(30) NOT NULL,
    question TEXT NOT NULL,
    options JSON,
    answer VARCHAR(255) NOT NULL,
    explanation TEXT,
    difficulty VARCHAR(20) DEFAULT 'medium',
    points INTEGER DEFAULT 10,
    is_ai_generated BOOLEAN DEFAULT false,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

4.1.4 study_records (학습 기록)
CREATE TABLE study_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL,
    user_answer VARCHAR(255),
    time_spent INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

================================================================================
【5. 문서 관리 시스템】
================================================================================

5.1 문서 업로드 규격

5.1.1 워크시트메이커 - Day 형식
Day 11
1. p54~56-no.1
As the parent of a gifted child, you might think your child...

2. p54~56-no.2
The rapid advancement of artificial intelligence...

5.1.2 워크시트메이커 - 페이지 형식
고1_2024_09월(인천시)
1. p2-no.20
Dear Students, We are pleased to announce...

2. p3-no.21
Climate change is one of the biggest threats...

5.1.3 모의고사 형식
[MOCK_TEST]
시험명: 2024년 6월 모의고사
학년: 3
문제번호: 18
Dear Students...

5.1.4 부교재 형식
[TEXTBOOK]
학교: 만수고등학교
학년: 2
문제번호: 1
The smartphone has revolutionized...

5.2 워크시트메이커 자동 처리 기능
- 제목에서 학년, 연도, 월 자동 추출
- Day 형식은 Day별로 Unit 구분
- 페이지 형식은 5문제마다 Part로 구분
- 영어 지문만 추출 (한글 해석 자동 제외)
- 문제 번호와 페이지 정보 자동 파싱

5.3 파일 지원 형식
- TXT 파일: 완전 지원
- PDF 파일: 워크시트메이커 자동 파싱 지원
- 파일 크기 제한: 10MB

================================================================================
【6. 문제 생성 시스템】
================================================================================

6.1 문제 유형 상세

6.1.1 빈칸 채우기 (Blank)
- 설명: 문맥상 적절한 어구 선택
- 배점: 2-3점
- AI 생성 가능: ✓

6.1.2 어법/문법 (Grammar)
- 설명: 밑줄 친 부분 중 틀린 것 찾기
- 배점: 2점
- AI 생성 가능: ✓

6.1.3 어휘 (Vocabulary)
- 설명: 문맥상 적절한 어휘 선택
- 배점: 2점
- AI 생성 가능: ✓

6.1.4 제목/주제 (Title/Theme)
- 설명: 글의 제목이나 주제 찾기
- 배점: 2점
- AI 생성 가능: ✓

6.1.5 문장 삽입 (Insertion)
- 설명: 주어진 문장의 적절한 위치
- 배점: 2점
- AI 생성 가능: ✗ (규칙 기반)

6.1.6 순서 배열 (Order)
- 설명: 문단의 논리적 순서
- 배점: 2점
- AI 생성 가능: ✗ (규칙 기반)

6.2 문제 난이도 조절
- 하 (고1): 2000단어, 단문 위주, 직접 명시
- 중 (고2): 3500단어, 복문 포함, 1단계 추론
- 상 (고3): 5000단어, 복잡한 구문, 2단계 추론

아래 매뉴얼만 있으면 “영어 원문(지문)”만 주어져도 수능/모의고사급 8대 유형을 일관된 형식으로 자동·반복 출제가 가능합니다. 실제 제공된 시험지의 문항 배치(21: 함축, 22: 요지, 23–24: 주제/제목, 29: 어법, 30: 어휘, 31–34: 빈칸, 35: 무관한 문장, 40: 요약)와 출제 문체·난이도·선지 구성 관례를 기준으로 설계했습니다.&#x20;

---

참고자료 : 수능 영어 8대 유형 “완전 출제 매뉴얼” (v2025-08)

## 공통 규격 (필수 준수)

* **지문**: 영어 원문(1\~5단락, 250–450w 권장).
* **문항 수/형식**: 각 유형 1문항씩, **보기 5개(①\~⑤)**, 정답 1개.
* **문두 문체**: 한국어 고정(예: “다음 글의 주제로 가장 적절한 것은?”).
* **정답·해설**: 출제자용으로 별도 제시(학생용 시험지에는 미노출 가능).
* **난이도 레버**: 단어 난도·문장 구조 복잡도·오답 간 유사성·추론 깊이로 조정.

---

## 1) 함축적 의미 (Implicit Meaning) — “표현/은유/핵심 구절 해석”

**출제 의도**
지문 속 \*\*표현(은유·관용·핵심 구절)\*\*이 암시하는 바를 논리·문맥 기반으로 해석시키는 문제. (예: *hunting the shadow, not the substance* → ‘형식·이론만 좇고 실질을 놓침’)

**정답 판단 규칙**

* 타깃 구절의 **직접 번역** 금지. 문단 전후 **대조/원인·결과**를 근거로 **함축된 태도/평가** 추출.
* 정답은 “구체적 행동+가치판단”이 함께 드러나야 함(예: “실무역량 없이 이상만 좇음”).

**오답(보기) 설계**

* 키워드 일부만 잡아 **방향 전환**(역의미), **범위 과/과소 일반화**, **핵심 논리 고리 탈락** 유형으로 구성.
* 길이·문체 균형: 정답이 유난히 짧거나 장황하지 않게.

**난이도 조절**

* 쉬움: 구절 바로 옆에 **반례/대조** 명시.
* 어려움: 함축 구절과 근거가 **문단 떨어져 위치**.

**출제 절차**

1. 지문에서 **은유/핵심 구절** 표시 → 2) 앞뒤 문장 논리관계(원인·대조·귀결) 표식 → 3) ‘화자의 평가’ 한 줄로 요약 → 4) 그 요약을 정답화 → 5) 의미 왜곡 4종으로 오답 제작.

**문두 템플릿**

* *“밑줄 친 {표현}이 다음 글에서 의미하는 바로 가장 적절한 것은?”*

---

## 2) 요지 (Gist/Claim) — “글 전체의 중심 주장”

**출제 의도**
**글 전체의 핵심 주장**(one-sentence thesis)을 찾게 함.

**정답 판단 규칙**

* **주체+핵심 동사+핵심 대상/효과**가 모두 포함된 **일반명제형** 문장.
* **사례/부연/예외**를 정답에 넣지 않음.

**오답 설계**

* 세부 사례의 **부분 일반화**, **배경정보의 주제화**, **조건/범위 누락**.

**난이도 조절**

* 쉬움: 주제문이 도입·결말에 명시.
* 어려움: 주제문 생략, **사례 중심 전개**.

**문두 템플릿**

* *“다음 글의 요지로 가장 적절한 것은?”*

---

## 3) 주제/제목 (Topic/Title) — “내용을 아우르는 압축 라벨”

**출제 의도**
전체 내용의 **포괄적 주제** 또는 **정보성·중립적 제목** 선택.

**정답 판단 규칙**

* **핵심 개념+변화/관계/효과** 구조(예: *“산업화가 노동시간 패러다임을 재구성하다”*).
* 제목형은 **선정성·주관 표현 배제**, **핵심 초점**만 담기.

**오답 설계**

* **부분 범주** 확대/축소, **원인↔결과 전도**, **주객 전도**.

**문두 템플릿**

* *“다음 글의 주제로 가장 적절한 것은?”* / *“제목으로 가장 적절한 것은?”*

---

## 4) 어법 (Grammar/Usage) — “문장 속 오류 탐지”

**출제 의도**
문장 단위의 **문법/호응/일치/분사구문/관계사/동사형** 오류 식별.

**정답 판단 규칙**

* 오답(틀린 것) 지시에 맞게 **유일한 오류** 한 곳만 존재.
* **주어-동사 수일치**, **시제 일관**, **준동사 논리 주어**, **수동/능동**, **전치사·관사 관용** 우선 검토.

**오답 설계**

* 나머지 4선지는 **정문**.
* 오류 선지는 **근거 규칙 한 줄**로 설명 가능해야 함.

**난이도 조절**

* 쉬움: **표면적 일치**(수일치, 시제) 오류.
* 어려움: **의미·구문 통합**(분사/동격/가정법/관용표현).

**문두 템플릿**

* *“다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?”*
* 변형: *“…맞은 것은?”* (정답 위치 재조정)

---

## 5) 어휘(문맥상 부적절) — “의미 충돌/뉘앙스 어긋남”

**출제 의도**
연결어/감정어/논리어휘/관용의 **문맥 적합성** 평가.

**정답 판단 규칙**

* 문맥의 \*\*전후 논리(원인–결과/대조/양보)\*\*와 **감정·가치 방향**과 **불일치**하는 1개 선택.

**오답 설계**

* 나머지 4개는 \*\*의미장(semantic field)\*\*이 글의 흐름과 일치.
* 정답은 **형태·품사**는 맞지만 **뉘앙스/극성**만 어긋나게.

**난이도 조절**

* 쉬움: **반의/역방향** 단어 섞기.
* 어려움: **의미 근접 동의어** 중 미세한 차이로 갈라내기.

**문두 템플릿**

* *“다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?”*

---

## 6) 빈칸 (Cloze) — “핵심 개념/논리 결손 복원”

**출제 의도**
핵심 **개념어/논리 연결/귀결 요지**를 빈칸으로 가리고 **추론 복원**.

**정답 판단 규칙**

* 빈칸 앞뒤에 **명시적 실마리**(정의·대조·예시→결론)가 있어야 하며, 정답은 **문장 의미를 완결**.
* **A/B형**(단어/구/절) 모두 가능하되, **문장 성분 호응** 철저.

**오답 설계**

* **주제와 동떨어진 개념**, **논리표지어 반대**, **범위 과도 확장**.

**난이도 조절**

* 쉬움: 정의·재진술 직후 빈칸.
* 어려움: 빈칸과 **실마리 원거리 배치**, **은유적 표현**.

**문두 템플릿**

* *“다음 빈칸에 들어갈 말로 가장 적절한 것을 고르시오.”*

---

## 7) 무관한 문장 — “담화 응집성 끊김 탐지”

**출제 의도**
단락에서 **주제 흐름·응집 장치**(지시어, 반복어, 일관된 초점)와 **불일치**하는 문장을 찾기.

**정답 판단 규칙**

* 후보 문장이 **주제·범주·시제/대상/관점** 중 하나 이상을 **단절**.
* 연결어(또는·그러나·따라서)와 **논리 기능** 불일치 확인.

**오답 설계**

* 나머지 4문장은 \*\*참조망(키워드 반복/대명사 지시/조건-귀결)\*\*로 촘촘히 연결되게.

**난이도 조절**

* 쉬움: 명백한 **다른 주제/영역** 삽입.
* 어려움: 겉으론 관련 있어 보이나 **담화 기능이 엇나감**(예: ‘식당 확대’ vs ‘스포츠 관광’).

**문두 템플릿**

* *“다음 글에서 전체 흐름과 관계 없는 문장은?”*

---

## 8) 요약 (A, B) — “한 문장 압축 + 핵심 대비/인과”

**출제 의도**
글 전체를 **한 문장**으로 압축하고, \*\*핵심 축(A)\*\*과 \*\*논리 작용(B)\*\*을 정확히 끼워 넣기.

**정답 판단 규칙**

* (A)에는 글의 **핵심 속성/변수**(예: controllability of synthetic vs variability of natural)
* (B)에는 글의 **주장에 대한 작용**(challenge/question/reverse/support 등)
* 두 빈칸이 합쳐져 **원저 주장**을 정확히 재현해야 함.

**오답 설계**

* (A) 축 교란(affordability 등 **비핵심 속성**),
* (B) 논리 작용 전도(support ↔ challenge).

**난이도 조절**

* 쉬움: 결말 문장에 **요지 재진술**.
* 어려움: **예외·주의 절**(however, nevertheless) 다수 포함.

**문두 템플릿**

* *“다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?”*

---

## 출제 파이프라인 (모든 유형 공통 7단계)

1. **핵심 구조 표지**: 주제문·대조·원인·귀결·전환(However/Thus/So/Yet) 표시.
2. **개념 맵**: 핵심 개념 노드와 관계(↑/↓/↔/원인→결과) 도식화.
3. **핵심 문장 2–3개** 선정(요지/주제/결론 후보).
4. **유형 매핑**:

   * 함축: 은유/평가·대조 구절
   * 요지/제목: 핵심 명제
   * 어법: 문장 5\~7개에서 규칙 포인트 노출
   * 어휘: 논리 연결·감정어 밀집 문장
   * 빈칸: 정의→예시→귀결 흐름의 **귀결/핵심 개념**
   * 무관: 응집 장치 끊기는 문장
   * 요약: (A) 핵심 속성, (B) 논리 작용어
5. **정답 문안 확정**(근거 문장 링크 기록).
6. **오답 엔지니어링**(역의미/부분 일반화/논리표지 전도/미세 뉘앙스 교란).
7. **QC 체크**(아래 표).

---

## 오답(보기) 엔지니어링 패턴 라이브러리

* **역의미 전환**: promote ↔ deter, increase ↔ diminish
* **범주 혼동**: process ↔ outcome, cause ↔ effect
* **과잉 일반화**: 사례를 법칙처럼 확장
* **조건 누락**: “when/if/among” 조건 삭제
* **극성 교란**: beneficial ↔ harmful, cautious ↔ reckless
* **논리 연결 왜곡**: however ↔ therefore

---

## 난이도 설계 가이드

* **어휘 난도**(B2→C1→C2), **문장 길이/삽입절**, **정보 밀도**, **오답 유사도** ↑↓
* **빈칸 원거리성**(단서와 거리), **은유 농도**, **담화 기능 미세 차**로 고난도화.

---

## QC 체크리스트 (출제자용)

* [ ] 보기 5개 **길이·문체 균형**
* [ ] 정답 **유일성** 검토(반례 불가)
* [ ] **문두/지시어** 한국어 관례 준수
* [ ] **어법**: 실제 오류 1개만 존재
* [ ] **어휘**: 품사·문장구조 적합성 유지
* [ ] **빈칸**: 정답 넣으면 **완전한 의미/문법**
* [ ] **무관**: 응집 장치(지시어·반복어·논리표지) 단절 명확
* [ ] **요약(A,B)**: 축/작용 정확, 원문 주장 보존
* [ ] **해설**: 근거 문장·규칙 1\~2줄로 명확
* [ ] 표절·직역 과다 회피(지문 자체 변형 금지)

---

## 문두/보기 “카피-레디” 템플릿 모음

### (1) 함축

* **문두**: *“밑줄 친 {표현}이 다음 글에서 의미하는 바로 가장 적절한 것은?”*
* **보기 패턴**:
  ① (이상/이론만 추구) ② (필수 요소 배제) ③ (실천 결여·형식 추구) ④ (물질 우선) ⑤ (구시대 답습)

### (2) 요지

* **문두**: *“다음 글의 요지로 가장 적절한 것은?”*
* **정답 예시 구조**: “X 능력은 Y 맥락에서 **소통·협력**을 촉진한다.”

### (3) 주제/제목

* **문두**: *“다음 글의 주제(제목)로 가장 적절한 것은?”*
* **제목형**: “{핵심 개념}: {관계/변화/효과}”

### (4) 어법

* **문두**: *“다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?”*
* **오류 후보 은닉 패턴**:

  * 수일치(s-pl), 시제 일관성, 관계대명사 격, 분사구문 논리주어, 가정법, 관용 전치사, 병렬 구조.

### (5) 어휘

* **문두**: *“문맥상 낱말의 쓰임이 적절하지 않은 것은?”*
* **정답 견인 장치**: 감정·가치 극성, 인과/대조 접속 논리 불일치.

### (6) 빈칸

* **문두**: *“다음 빈칸에 들어갈 말로 가장 적절한 것을 고르시오.”*
* **정답 범주**: (핵심 개념어/귀결 문구/대조 전환어/핵심 은유).
* **예시**: *personal involvement / mental liberation / the real product being sold is you / facilitate productive activity …* 등 지문 논리 완결어.

### (7) 무관

* **문두**: *“다음 글에서 전체 흐름과 관계 없는 문장은?”*
* **정답 신호**: 주제전환, 범주 이탈(‘숙박·식당’ vs ‘스포츠 관광’).

### (8) 요약(A,B)

* **문두**: *“다음 글의 내용을 한 문장으로 요약… (A), (B)에 들어갈 말…”*
* **정답 형식**:

  * (A) 핵심 속성(예: **controllability / variability**)
  * (B) 논리 작용(예: **challenge / question**)

---

## LLM용 “한 번에 8유형 생성” 마스터 프롬프트 (붙여쓰기)

> **입력**: 영어 원문 지문
> **출력**: 아래 8유형 문항(①~~⑤), 정답, 해설(근거 문장/규칙 1~~2줄).
>
> 1. 함축: 지문 속 {표현/은유}를 지정해 의미 추론형 5지선다 제작(정답=함축 의미, 오답=역의미/부분일반화/논리누락).
> 2. 요지: 글 전체 1문장 명제화 → 5지선다(정답=일반명제, 오답=사례/배경/조건누락).
> 3. 주제/제목: 포괄적 라벨 5개(정답=핵심 개념+관계/변화).
> 4. 어법: 문장 5\~7개 중 1곳만 실제 오류(수일치/시제/관계사/분사 등), 나머지 정문.
> 5. 어휘: 문맥상 부적절 어휘 1개+적절 4개(논리·극성 불일치로 제작).
> 6. 빈칸: 핵심 개념/귀결/논리표지어 1곳 공란 → 5지선다(정답=의미·문법 완결).
> 7. 무관: 단락 5문장 중 흐름·응집 끊는 1문장.
> 8. 요약(A,B): 한 문장 압축 후 (A)=핵심 속성, (B)=논리 작용(choose from: support/challenge/question/reverse/intensify…).
>    각 문항에 **정답(숫자)**, **해설(근거 문장/규칙)** 반드시 포함.

---

## 실전 적용 메모

* 실제 제공 시험지의 문체·문두·보기 톤을 모사하면 신뢰도↑ (예: 22번 요지, 23~~24 주제/제목, 29 어법, 30 어휘, 31~~34 빈칸, 35 무관, 40 요약의 전형적 구성과 동일 톤 유지).&#x20;

---

원하시면, 이 매뉴얼을 바로 쓰는 **자동 생성 템플릿(예: JSON 스키마)** 과 **출제자용 QC 체크시트(스프레드시트)** 파일을 같이 만들어 드릴게요.


================================================================================
【7. 단어 시험 시스템】
================================================================================

7.1 단어 분류
고1 (2000단어)
├── 기초 필수 (500)
├── 교과서 빈출 (800)
├── 모의고사 빈출 (500)
└── 확장 어휘 (200)

고2 (3500단어)
├── 고1 복습 (500)
├── 중급 필수 (1000)
├── 수능 기출 (1500)
└── 숙어/관용어 (500)

고3 (5000단어)
├── 고1-2 복습 (1000)
├── 고급 필수 (1500)
├── 수능 최빈출 (2000)
└── EBS 연계 (500)

7.2 시험 모드
- 빠른 체크: 영어→뜻, 10초/문제, 4지선다
- 정밀 모드: 혼합 형식, 15초/문제
- 철자 모드: 뜻→영어 입력, 20초/문제
- 종합 모드: 모든 유형 혼합, 적응형 난이도

================================================================================
【8. 학습 시스템】
================================================================================

8.1 학습 모드
- 내신 대비: 학교별 기출 중심
- 수능 대비: 평가원/수능 기출
- 종합: AI가 취약점 분석 후 추천

8.2 학습 통계
실시간:
- 연속 정답 수
- 세션 정답률
- 평균 소요 시간
- 일일 잔여 문제

누적:
- 총 문제 수
- 정답률
- 학습 일수
- 취약/강점 유형

================================================================================
【9. 게이미피케이션】
================================================================================

9.1 티어 시스템
- Iron (0-999 LP): 기본
- Bronze (100-1999 LP): 프로필 뱃지
- Silver (2000-2999 LP): 실버 테두리
- Gold (3000-4999 LP): 골드 테두리
- Platinum (5000-9999 LP): 플레티넘 테두리, 플레티넘 이펙트
- Diamond (10000-29999 LP): 다이아몬드 테두리, 다이아몬드 이펙트
- Master (30000-99999 LP): 마스터 테두리, 마스터 이펙트
- Challenger (100000+ LP): 챌린저 특별 테두리, 챌린저 특별 이펙트

9.2 LP 시스템
획득:
- 정답: +10 LP (기본)
- 연속 정답: +15 LP
- 일일 첫 학습: +30 LP
- 주간 목표: +100 LP

차감:
- 오답: -5 LP
- 시간초과: -3 LP
- 포기: -10 LP

================================================================================
【10. 결제 및 멤버십】
================================================================================

10.1 멤버십 플랜

무료 플랜:
✓ 일일 30문제
✓ 기본 통계
✓ DB 문제만
✓ 단어 시험 10개/일
✗ AI 문제 생성
✗ 상세 분석

프리미엄 플랜 (월 9,900원):
✓ 무제한 문제
✓ AI 문제 생성
✓ 상세 통계/분석
✓ 오답노트 자동 생성
✓ 단어 시험 무제한
✓ 광고 제거

================================================================================
【11. API 명세서】
================================================================================

11.1 인증 API
POST /api/signup - 회원가입
POST /api/login - 로그인
POST /api/logout - 로그아웃
POST /api/refresh - 토큰 갱신

11.2 문서 API
POST /api/upload-document - 문서 업로드
GET /api/documents - 문서 목록 조회
GET /api/documents/:id - 문서 상세 조회
DELETE /api/documents/:id - 문서 삭제

11.3 문제 API
POST /api/get-smart-problems - 문제 생성/조회
POST /api/problems/submit - 답안 제출
GET /api/problems/history - 문제 풀이 기록

11.4 통계 API
GET /api/stats/summary - 통계 요약
GET /api/stats/detailed - 상세 통계

================================================================================
【12. 현재 진행 상황】
================================================================================


================================================================================
【13. 실행 방법】
================================================================================

환경 설정:
1. Node.js 18+ 설치
2. Git 클론: git clone [repository-url]

서버 실행:
cd server
npm install
npm start

클라이언트 실행:
cd client
npm install
npm start

환경 변수 (.env):
OPENAI_API_KEY=your_key_here
JWT_SECRET=your_secret_here
PORT=5000

테스트 계정:
- 관리자: admin / admin123
- 학생: student1 / student123

================================================================================
【14. 개발 로드맵】
================================================================================

Phase 1: MVP 
✅ 기본 회원가입/로그인
✅ 문서 업로드
✅ 워크시트메이커 지원
⬜ 규칙 기반 문제 생성
⬜ 기본 학습 기능
⬜ 간단한 통계

Phase 2: 핵심 기능
⬜ AI 문제 생성
⬜ 단어 시험
⬜ 티어 시스템
⬜ 결제 시스템
⬜ 관리자 대시보드

Phase 3: 고도화
⬜ 고급 통계/분석
⬜ 맞춤형 추천
⬜ 소셜 기능
⬜ 모바일 앱
⬜ API 오픈

================================================================================
【15. 워크시트메이커 AdminPage 코드】
================================================================================

// 문서 업로드 상태 관리
const [documentForm, setDocumentForm] = useState({
  docType: 'worksheet', // worksheet, mocktest, textbook
  title: '',
  unit: '',
  number: '',
  examDate: '',
  grade: '1',
  worksheetType: 'day' // day, page
});

// 워크시트메이커 형식 감지
const detectWorksheetType = (title) => {
  if (title.includes('Day')) return 'day';
  if (title.includes('고') && title.includes('월')) return 'page';
  return 'day';
};

// 제목에서 정보 추출
const extractInfoFromTitle = (title) => {
  const info = {
    grade: '1',
    year: new Date().getFullYear(),
    month: null
  };

  const gradeMatch = title.match(/고(\d)/);
  if (gradeMatch) info.grade = gradeMatch[1];

  const yearMatch = title.match(/20\d{2}/);
  if (yearMatch) info.year = yearMatch[0];

  const monthMatch = title.match(/(\d{1,2})월/);
  if (monthMatch) info.month = monthMatch[1].padStart(2, '0');

  return info;
};

================================================================================
【16. 서버 PDF 지원 코드】
================================================================================

// 파일 업로드 설정 (PDF 추가)
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('PDF 또는 TXT 파일만 가능합니다.'));
    }
  }
});

// 워크시트메이커 PDF 텍스트 정리
function cleanWorksheetMakerPDF(text) {
  let cleanText = text
    .replace(/Page \d+/g, '')
    .replace(/워크시트메이커/g, '')
    .replace(/Day \d+/g, (match) => '\n' + match + '\n')
    .replace(/(\d+)\.\s*p/g, '\n$1. p')
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
  return cleanText;
}

// 워크시트메이커 파싱 함수
function parseWorksheetMaker(content, worksheetType) {
  const problems = [];
  
  if (worksheetType === 'day') {
    // Day 형식 파싱
    const regex = /(\d+)\.\s*p[\d~-]+no\.(\d+)\s*([\s\S]*?)(?=\d+\.\s*p[\d~-]+no\.|$)/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const problemNum = match[1];
      const text = match[3].trim();
      
      // 영어만 추출
      const englishOnly = text.split('\n')
        .filter(line => {
          const englishRatio = (line.match(/[a-zA-Z]/g) || []).length / line.length;
          return englishRatio > 0.5;
        })
        .join(' ');
      
      if (englishOnly.length > 20) {
        problems.push({
          number: problemNum,
          text: englishOnly
        });
      }
    }
  } else {
    // Page 형식 파싱
    const regex = /(\d+)\.\s*p(\d+)-no\.(\d+)\s*([\s\S]*?)(?=\d+\.\s*p\d+-no\.|$)/g;
    // ... 유사한 처리
  }
  
  return problems;
}

================================================================================
【17. 다음 채팅에서 참조할 내용】
================================================================================

"League of English 프로젝트 이어서 개발합니다.
GitHub: https://github.com/JaekwonJo/league-of-english
현재 상황: 
- 워크시트메이커 형식 지원 완료
- PDF/TXT 업로드 가능
- 기본 구조 완성
다음 목표: 
- 문제 생성 기능 구현
- 문제 풀이 인터페이스
- 채점 시스템
특이사항:
- 워크시트메이커 자동 파싱 지원
- 영어 지문만 자동 추출"

================================================================================


League of English /
🎯 League of English 완전 개발 가이드 - 다음 AI를 위한 상세 매뉴얼
📌 프로젝트 핵심 이해
이 프로젝트는 수능 모의고사 스타일의 영어 문제를 AI가 무한 생성하는 웹앱입니다. 
학원에서/관리자가 내신대비 문서를 업로드하면 그 문서에 있는 원문으로 변형문제 즉, 규칙에 의한 문제, 혹은 GPT가 자동으로 수능 스타일 문제를 만들어줍니다.
또한,단어장 파일도 업로드해서 단어 시험도 볼 수 있게 합니다. 


🏗️ 기술 스택 & 파일 구조

/league-of-english
├── /src
│   └── App.js  - React 프론트엔드
├── /server  
│   ├── server.js  - Express 백엔드
│   ├── database.db - SQLite 데이터베이스
│   ├── .env - 환경변수 (OPENAI_API_KEY 필수!)
│   └── /uploads - 임시 파일 저장
└── package.json

💾 데이터베이스 구조
sql

1. users - 사용자 (학생/학원(강사)/관리자)
2. documents - 업로드된 문서 (카테고리별로 정리 가능해야됨)
3. problems - 생성된 문제들
4. study_records - 학습 기록
5. problem_generations - 문제 생성 기록 (비용 제한용)
🔑 핵심 API 엔드포인트
1. 인증
* POST /api/register - 회원가입
* POST /api/login - 로그인 (JWT 토큰 발급)
2. 문서 관리
* POST /api/upload-document - 문서 업로드 & AI 문제 생성 
* GET /api/documents - 문서 목록 (학생은 모든 문서를 볼 수 있는게 아니라, 카테고리에 자기 아이디에 할당된 자신의 학원 자료만 볼 수 있음)
3. 문제 관리
* POST /api/get-smart-problems - 스마트 문제 가져오기
   * 중복 방지 (최근 푼 문제 제외)
   * 정답률 낮은 문제 우선
   * 캐싱 시스템 (100개 이상이면 재사용) 단, 순서배열 문제와 문장삽입 문제는 규칙으로 계속 무한 생성 가능해야됨.
   * 없으면 GPT로 새로 생성
🎨 UI 컴포넌트 구조
javascript

App.js 구조:
- AuthContext (전역 인증 상태)
- LoginPage - 로그인/회원가입
- MainLayout - 사이드바 레이아웃
  ├── HomePage - 대시보드
  ├── StudyPage - 문제 풀기 ⭐️ 핵심!
  ├── VocabularyPage - 단어 시험
  ├── StatsPage - 통계
  ├── RankingPage - 랭킹
  ├── ProfilePage - 프로필
  └── AdminPage - 관리자 (문서 업로드)
🚨 StudyPage 핵심 로직
javascript

// 1. 설정 화면
- 내신문제/
- 난이도: 기본/고급
- 학습모드: 내신(문서선택)/수능
- 문제 개수 & 유형 선택
문제 개수를 설정할 수 있고, 숫자로 입력도 가능하며 +,-로도 가능.  초기화 버튼도 있어야 됨.


// 2. 문제 가져오기 흐름
startStudy() → /api/get-smart-problems → 
  → DB에서 찾기 (중복제외, 어려운것 우선)
  → 없으면 GPT 생성
  → 문제 표시

// 3. 문제 풀이
- handleAnswer() - 답 선택
- nextProblem() - 다음 문제
- finishStudy() - 완료 & 기록 저장

다음 문제로도 갈 수 있고, 
이전 문제로도 갈 수 있어야 함. (이전에 푼 문제 확인 가능)

시간 제한이 있어야 함. 
기본 모드는 1문제당 2분이 주어지고,
고급 모드는 1문제당 1분이 주어짐.

기본 모드의 순서배열 문제는 A-B-C 이런식으로 되지만,
고급 모드의 순서배열 문제는 A-B-C-D-E 이렇게 5개를 배열해야됨.

// 4. 단어 시험
단어 시험은 
단어장을 업로드 하여, 그것을 선택하게 합니다.
그리고 1회 단어 TEST에 30개씩 보게 합니다.
전부 뜻 선택하기 객관식 문제로 냅니다.
이것도 역시 통계에 반영되고, 점수화 (랭크)에 반영됩니다. 
문제풀이보다 점수는 매우 적게 반영됩니다.


⚠️ 자주 발생하는 문제들
1. "문제를 불러오는데 실패했습니다"
   * OpenAI API 키 확인 (.env 파일)
   * documentId 누락 확인
   * 서버 에러 로그 확인
2. 문법 에러
   * 중괄호 짝 맞추기
   * JSX에서 && 다음에 ( 필요
3. undefined 에러
   * state 정의 누락 (setIsLoading 등)
   * 함수 정의 누락 (handleAnswer 등)
🎯 개발자가 원하는 것
1. 문제 유형 선택 UI
   * 체크박스로 원하는 유형만 선택
   * 각 유형별 개수 설정
2. 진짜 수능 스타일 문제
   * "다음 글의 ~" 형식
   * ①②③④⑤ 선택지
   * 적절한 난이도
3. 스마트한 시스템
   * 같은 문제 반복 X
   * 어려운 문제 우선
   * 비용 절감 (캐싱)
📝 다음 개발자를 위한 TODO

javascript

// 1. StudyPage에 문제 설정 UI 추가
const [config, setConfig] = useState({
  mode: 'curriculum',
  difficulty: 'medium', 
  problemCount: 20,
  documentId: null,
  types: {  // ⭐️ 이거 추가!
    blank: 3,
    order: 2,
    grammar: 2,
    vocabulary: 2,
    title: 1,
    theme: 1,
    insertion: 1
  }
});

// 2. UI에 체크박스/숫자 입력 추가
// 3. startStudy()에서 types 전달
// 4. 서버에서 types 받아서 처리
💬 개발자의 성격/스타일
* 빠른 구현 선호 (MVP)
* 임시방편 싫어함 (제대로 만들기)
* 내신대비에 진심!!
* UI/UX 중요시
* 학생 편의성 최우선
🔥 절대 놓치면 안 되는 것
1. 무한 생성 - 같은 문서로 계속 새 문제 (다만, 순서배열과 문장삽입은 규칙에 따라 출제해야됨)
2. 스마트 캐싱 - 돈 아끼면서 품질 유지 (한 유형당 100문제까지 만들어지면, 그다음부터는 DB에 저장해서 그 문제들을 계속 풀게 하고, 
어떤 한 학생이 그 100문제를 전부 다 풀었을 경우에는 다시 GPT로 생성해서 200문제까지 늘리고, 또 그 문제를 누군가 다 풀면, 다시 생성하게끔)
3. 중복 방지 - 최근 푼 문제 제외
4. 난이도별 - 기본/고급
5. 문서 선택 - 학원,강사 혹은 관리자가 올린 자료 사용 (카테고리로 정리해서 업로드 하고, 학생 ID에는 모든 업로드된 문서만 볼 수 있는게 아니라, 회원가입할 때 할당된 학원,혹은 관리자의 문서만 볼 수 있게 해야됨)

이 개발자는 정말 좋은 서비스를 만들고 싶어합니다. 학생들이 쉽게 쓸 수 있고, 진짜 도움이 되는 서비스요. 화이팅! 🚀

📘 리그 오브 잉글리시 (League of English)시험대비 어플 프로젝트 지침 & 소개⸻한 줄 정의원문 교재/시험범위 문서를 넣으면 → 자동으로 수능형 영어 변형문제(문장삽입·순서배열·어법·어휘·빈칸·제목·요지·서술형)가 무한 생성되는 앱.
학생은 스마트폰에서 시험처럼 연습 → 채점 → 해설 → 오답패턴 → 통계 → 랭크업까지 경험.⸻핵심 기능
학부모는 할당된 자신의 자녀인 학생의 모든 정보를 볼 수 있음.
***관리자***는 모든 학생의 정보를 볼 수 있음.

 •    문제 자동 생성: 원문 → 무한 변형 문제 출제
 •    유형 지원:
 •    객관식: 문장삽입 / 순서배열 / 빈칸 / 어법 / 어휘 / 제목 / 요지 / 내용일치
 •    서술형: 제목 쓰기 / 주장 쓰기 / 요약하기
 •    시험 모드:
 •    문제 수 선택 (예: 20문제)
 •    시간 제한 설정 (예: 30분)
 •    채점 + 합격/불합격 커트라인 (예: 90점 이상 합격)
 •    학습 루프:
 •    점수 → 정답/해설 → 오답패턴 기록 → 다시 시험 → 점수 향상 추적
 •    통계 대시보드:
 •    점수 추이 / 유형별 정확도 / 오답패턴 분석
 •    랭크 시스템 (게임식):
 •    Iron → Bronze → Silver → Gold → Platinum → Diamond → Master → Challenger
 •    레벨이 오를수록 문제 난이도↑, 제한시간↓, 서술형↑⸻사용 흐름 (학생 입장)
 1.    앱 설치 (PWA → 아이폰/갤럭시 다 지원)
 2.    회원가입 (아이디/비밀번호 + 이름·학교·학년 입력)
 3.    로그인 후 → 교재/시험범위 선택
 4.    선생님이 지정한 범위 or 본인이 원하는 모드로 문제 시작
 5.    제한 시간 안에 문제 풀기
 6.    제출 → 자동 채점 → 점수/등급 표시
 7.    오답 해설 보기 (LLM이 자세히 설명)
 8.    통계/성취도 확인 → 레벨업 도전⸻사용 흐름 (선생님/관리자 입장)
 1.    원문 파일 업로드 (예: 수능특강, 내신 시험범위)
 2.    GPT가 자동으로 JSON 변환 (문제 템플릿 구조화)
 3.    원하는 학생 그룹에게 할당 (반·학교·프리미엄 권한)
 4.    대시보드에서 학생들의 점수/통계 확인
 5.    숙제/재시험 과제 지정 가능 (예: “내일까지 순서배열 3회, 80점 이상” •    문제집 대신 무한 문제: 매번 새로 변형되니까 “외운다”가 아니라 “진짜 실력”이 늘어남
 •    게임처럼 공부: 랭크제 도입 → 아이언에서 챌린저까지 승급 → 동기부여 강화
 •    선생님 맞춤형: 숙제/범위 지정 가능, 학생 통계 확인 가능
 •    오답 해설: LLM이 “왜 틀렸는지”까지 알려주니까 혼자 공부할 때도 효과적⸻앞으로의 로드맵
 •    무료 버전: 기본 순서배열, 문장 삽입 (API필요없이 규칙만으로 생성되는 문제만 하루에 30문제씩만 풀기 가능), 단어시험도 하루에 30개씩 (Test1)만 가능.
 •    구독제:  개인 월구독 ( 프리미엄 요금제 월 9,900원 )
 •    학원 전용 구독 (학생 수별 요금제)
 •    확장 가능성: 초/중/고 전 학년 확장 - 객관식 수능형 문제 뿐만 아니라 내신 워크북 문제로도 확장 가능.
 •    전국 단위 랭킹전 "League of English" 대회 (수능 문제)

⸻설치/사용 (쉬운 설명)
1.    앱 다운로드 말고, 그냥 홈화면에 추가(PWA) 하면 됨
→ 아이폰/갤럭시 다 지원
2.    처음엔 무료 체험 → 로그인 후 시작
3.    선생님이 주는 교재 범위 선택 → 문제 풀기
4.    끝나면 채점/점수/해설 → 다시 반복!⸻✅ 요약:
리그 오브 잉글리시는
“문제집 대신 무한 변형 문제를 게임처럼 즐기면서 랭크 올리듯 공부하는 영어 시험 대비 앱”입니다.⸻
그래픽도 진짜 좋게 만들고 싶고
문제도 수능 문제처럼 퀄리티 있게 만들고 싶어편집🎮 리그 오브 잉글리시 - 프리미엄 디자인 & 문제 퀄리티 전략
1. 🎨 비주얼 디자인 컨셉
메인 테마: "다크 아카데미아 × e스포츠"

색상 팔레트:

Primary: Deep Navy (#0F172A) + Electric Blue (#3B82F6)
Accent: Gold (#F59E0B) for achievements
Success: Emerald (#10B981)
Error: Ruby (#EF4444)
Background: Gradient mesh (Dark blue → Purple)

UI/UX 특징:
- 글래스모피즘 카드 (반투명 blur 효과)
- 네온 그라데이션 버튼 (호버시 glow 효과)
- 3D 아이콘 & 마이크로 애니메이션
- 파티클 효과 (레벨업, 정답 시)
- 다이나믹 배경 (시간대별 변화)

앱에 다양한 이펙트가 있어서 학생들이 지루해하지 않았으면 좋겠음.

랭크 비주얼:
각 티어별 고유 배지 디자인 (메탈릭 질감)
승급 시 폭죽 애니메이션 + 사운드
프로필 뱃지에 홀로그램 효과

🚀 이렇게 만들면:

학생들이 "공부"가 아닌 "게임"으로 인식
선생님들이 "효과적인 학습 도구"로 신뢰
학부모가 "투자 가치 있는 교육 앱"으로 평가
제작자는 "꾸준하고 안정적인 소득"으로 모두가 윈윈!
핵심은 "수능 퀄리티 + 게임 재미 + 데이터 분석"의 완벽한 조합입니다!


---

문제 풀었을 때

정답/오답 표시

✅ 정답: 초록색 + 반짝이는 효과
❌ 오답: 빨간색 + 흔들림 효과
1.5초 후 자동으로 다음 문제로 이동


🏆 결과 확인
시험 완료 화면

점수: 큰 숫자로 표시 (예: 85점)
등급: 트로피 이모지와 함께
통계:

정답 개수 (8/20)
소요 시간 (12:45)
획득 XP (+120)


문제별 분석

각 문제 번호와 정답(✓)/오답(✗) 표시
초록색: 맞춘 문제
빨간색: 틀린 문제

다음 행동
"오답 해설": 틀린 문제 해설 보기
"메인으로": 메인 화면으로 돌아가기





CLAUDE.md - League of English 프로젝트 규칙 템플릿
🎯 프로젝트 컨텍스트
yamlproject_name: League of English
description: AI 기반 수능형 영어 문제 자동 생성 플랫폼
location: C:\Users\jaekw\Desktop\league-of-english
status: 60% 완성 (UI 완성, 서버 디버깅 필요)
tech_stack:
  frontend: React 18
  backend: Express.js + Node.js 20
  database: SQLite3
  ai: OpenAI GPT-4-turbo
  styling: CSS (다크모드, 글래스모피즘)
📌 핵심 규칙
1. 커뮤니케이션 규칙

질문 우선: 코드 작성 전 반드시 구현 방향 확인
단계별 진행: 한 번에 모든 것을 구현하지 않고 단계별 테스트
초보자 친화: 모든 용어와 과정을 쉽게 설명
복사-붙여넣기 가능: 전체 코드 블록 제공

2. 코드 작성 규칙
javascript// 항상 이 순서로 진행
1. 현재 코드 백업 권장
2. 수정할 파일 명시
3. 전체 코드 제공 (부분 수정 지양)
4. 실행 명령어 제공
5. 예상 결과 설명
3. 파일 구조 유지
league-of-english/
├── server/
│   ├── server.js    # Express 서버
│   ├── database.db  # SQLite DB
│   ├── .env        # 환경 변수 (API 키)
│   └── uploads/    # 업로드 파일
├── client/
│   └── src/
│       ├── App.js  # React 메인
│       └── App.css # 스타일
🔧 현재 문제점 및 해결 우선순위
즉시 해결 필요 (Priority 1)

로그인 지속성: bcrypt 해싱 문제로 재로그인 불가
문서 조회: 업로드는 되나 조회 실패
500 에러: 서버 라우팅 문제

다음 단계 (Priority 2)

문제 생성 시스템 (규칙 기반 + AI)
채점 및 결과 저장
통계 시스템

💬 응답 템플릿
문제 해결 시
markdown## 🔍 문제 진단
[현재 상황 요약]

## ✅ 해결 방법
### Step 1: [작업명]
` ` `언어
[전체 코드]
` ` `

### Step 2: 실행
` ` `bash
[명령어]
` ` `

## 📋 확인 사항
- [ ] 서버 재시작
- [ ] 브라우저 새로고침
- [ ] 콘솔 에러 확인
새 기능 추가 시
markdown## 🎯 구현 목표
[기능 설명]

## 🤔 구현 전 확인
1. 현재 [파일명] 백업하셨나요?
2. 서버 실행 중인가요?
3. 어떤 방식을 선호하시나요?
   - A안: [간단한 방법]
   - B안: [완전한 방법]

## 📝 구현 코드
[선택 후 제공]
🚀 프로젝트 목표
최종 완성 모습

✅ 관리자: 문서 업로드 → 자동 문제 생성
✅ 학생: 로그인 → 문제 선택 → 풀이 → 채점 → 랭킹
✅ 시스템: 100문제 캐싱, 무한 생성, 통계 분석

핵심 기능

문서 파싱: PDF/TXT → 영어만 추출
문제 생성:

규칙: 순서배열, 문장삽입
AI: 빈칸, 어법, 어휘, 제목, 주제


게이미피케이션: LP, 티어, 랭킹

📚 테스트 데이터

인제고 올림포스2
인천시 9월 모의고사
공통영어2 YBM
하루6개 1등급

🔐 인증 정보
javascript// 관리자 계정
ID: admin
PW: admin123

// 테스트 학원
name: 수호학원
⚙️ 환경 변수 (.env)
envOPENAI_API_KEY=sk-proj-[실제키]
JWT_SECRET=leagueOfEnglish2025SuperSecretKey!@#$
PORT=5000
📝 이전 대화 참조 키워드

"이전에 만든 League of English 프로젝트"
"영어 문제 자동 생성 앱"
"수호학원 프로젝트"
"다크모드 React 앱"

🆘 응급 복구 명령어
bash# DB 초기화
cd server && del database.db && node server.js

# 캐시 클리어
npm cache clean --force

# 의존성 재설치  
rd /s /q node_modules && npm install

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

League of English is an AI-powered English learning platform for Korean students, featuring:
- React.js frontend with Create React App
- Node.js/Express backend with SQLite database
- OpenAI GPT-4 integration for AI problem generation
- JWT authentication system
- File upload for PDF/text documents
- Problem generation and scoring system

## Architecture

**Full-Stack Structure:**
- `client/` - React frontend application
- `server/` - Express.js backend with SQLite database
- Root contains shared package.json for coordination

**Database Schema:**
- `users` - User authentication and profile data
- `documents` - Uploaded learning materials
- `problems` - Generated questions with answers
- `study_records` - User performance tracking

**Key Backend Features:**
- AI problem generation using OpenAI GPT-4
- Rule-based problem types (ordering, sentence insertion)
- File processing for PDF/text document parsing
- JWT-based authentication middleware
- SQLite database with initialization scripts

**Frontend Architecture:**
- Single-page React app with component-based structure
- Context API for authentication state
- Lucide React icons throughout
- Responsive layout with sidebar navigation
- Multiple page components (Home, Study, Admin, etc.)

## Development Commands

**Root Level Commands:**
- `npm run install-all` - Install dependencies for both client and server
- `npm start` - Start the Express server in production mode
- `npm run dev` - Start server with nodemon for development
- `npm run client` - Start React development server
- `npm run build` - Build React app for production

**Client Commands (from client/ directory):**
- `npm start` - Start React development server on port 3000
- `npm test` - Run React tests with Jest
- `npm run build` - Create production build

**Server:**
- Runs on port 5000 by default
- Uses SQLite database stored in `server/database.db`
- File uploads stored in `server/uploads/`

## Environment Setup

**Required Environment Variables (.env in root):**
- `JWT_SECRET` - Secret key for JWT token signing
- `OPENAI_API_KEY` - OpenAI API key for problem generation
- `PORT` - Server port (defaults to 5000)

**Database:**
- SQLite database auto-initializes on first run
- Creates admin user with credentials: admin/admin123
- Tables created automatically via SQL in server.js

## Key Technical Details

**Authentication:**
- JWT tokens stored in localStorage
- Token format: "Bearer <token>" in Authorization header
- User context managed via React Context API

**File Upload:**
- Supports PDF and TXT files only
- 10MB file size limit
- Files processed to extract English text (Korean filtered out)
- Uploaded files deleted after processing

**AI Integration:**
- Uses OpenAI GPT-4-turbo-preview model
- Fallback to rule-based generation if AI fails
- Problem types: blank, grammar, vocabulary, title, theme, order, insertion

**Frontend State Management:**
- React Context for global authentication state
- Local component state for page-specific data
- No external state management library used

## Development Notes

- Server includes Korean comments and UI text
- English text extraction logic removes Korean characters
- Admin role required for document upload
- Problems support multiple difficulty levels (basic, medium, advanced)
- Timer functionality for problem-solving sessions