---
layout:	post
title: 하네스 엔지니어링 - AI 에이전트를 더 잘 작동시키는 방법
date: 2026-04-13 22:17:07 +0900
sitemap:
  changefreq: weekly
image: technology-24.jpg
author: GyuMyung
tags: technology
comments: true
---

## 개요
**하네스 엔지니어링**(Harness Engineering)은 AI 에이전트, 특히 Claude와 같은 대형 언어 모델이 특정 컨텍스트에서 더 일관되고 예측 가능하게 동작하도록 구조화된 지침과 도구를 제공하는 엔지니어링 실천 방법이다.

단순히 프롬프트를 잘 쓰는 것과는 다르게, 하네스 엔지니어링은 에이전트가 작동하는 환경 자체를 설계한다. AGENTS.md, Skills, Rules라는 세 가지 핵심 요소를 통해 AI가 팀의 코드베이스, 워크플로우, 컨벤션을 따르도록 돕는다.

## 하네스 엔지니어링 사례
실제 프로젝트에서 하네스 엔지니어링이 어떻게 적용되는지, 세 가지 핵심 컴포넌트를 통해 알아보자.

### AGENTS.md
`AGENTS.md`는 AI 에이전트에게 "이 프로젝트에서 어떻게 행동해야 하는가"를 설명하는 문서이다. 마치 신입 팀원에게 건네는 온보딩 문서처럼, 에이전트가 처음 프로젝트를 접할 때 읽어야 할 핵심 컨텍스트를 담는다.

좋은 `AGENTS.md`는 다음을 포함합니다.

- 프로젝트의 목적과 아키텍처 개요
- 주요 디렉터리 구조와 각 역할 설명
- 코드 스타일과 커밋 컨벤션
- 자주 사용하는 커맨드 (빌드, 테스트, 배포)
- 에이전트가 하면 안 되는 행동 (e.g., 특정 파일 직접 수정 금지)

```md
# AGENTS.md

## 프로젝트 개요
이 레포지토리는 결제 서비스의 백엔드 API입니다.
Node.js + TypeScript로 작성되었으며, PostgreSQL을 사용합니다.

## 주요 커맨드
- 빌드: pnpm build
- 테스트: pnpm test
- 마이그레이션: pnpm db:migrate

## 주의 사항
- 절대 .env 파일을 커밋하지 마세요
- DB 스키마 변경 시 반드시 마이그레이션 파일 생성
- PR 전에 pnpm lint 통과 필수
```

> AGENTS.md는 루트 디렉터리에 두는 것이 관례이지만, 서브 디렉터리별로 별도 AGENTS.md를 두어 컨텍스트를 계층화할 수도 있다. 에이전트는 현재 작업 디렉터리에 가까운 파일을 우선 참조한다.

### Skills
`Skills`는 에이전트가 반복적으로 수행하는 특정 작업의 best practice를 캡슐화한 문서이다. 에이전트는 특정 유형의 작업을 시작하기 전에 관련 Skill 문서를 먼저 읽고, 거기에 정의된 절차를 따른다.

개발 워크플로우에서 반복적으로 등장하는 작업들 — git 커밋 작성, PR 생성, 컨벤션 기반 리팩토링 — 은 각각 팀마다 고유한 규칙과 패턴이 있다. Skill 문서는 이 노하우를 축적해 에이전트가 매번 처음부터 시행착오를 겪지 않도록 한다.

- 스킬 예시 1. git-commit Skill

```md
# skills/git-commit/SKILL.md

## 커밋 메시지 형식
<type>(<scope>): <subject> [#issue]

type 목록: feat | fix | refactor | docs | test | chore
- feat: 새로운 기능 추가
- fix: 버그 수정
- refactor: 동작 변경 없는 코드 개선

## 작성 절차
1. git diff --staged 로 변경 사항 파악
2. 변경의 의도(why)를 한 줄로 요약 → subject
3. 관련 이슈 번호가 있으면 반드시 말미에 추가
4. subject는 50자 이내, 명령형으로 작성

## 예시
feat(auth): 소셜 로그인 구글 OAuth 연동 추가 [#142]
fix(payment): 결제 금액 소수점 반올림 오류 수정 [#189]
```

- 스킬 예시 2. git-pr Skill

```md
# skills/git-pr/SKILL.md

## PR 생성 절차
1. 브랜치 최신화: git fetch origin && git rebase origin/main
2. GitHub CLI로 PR 초안 생성:
   gh pr create --draft --title "..." --body "$(cat .github/PULL_REQUEST_TEMPLATE.md)"
3. 아래 섹션을 반드시 채울 것:
   - ## 변경 요약: 무엇을, 왜 변경했는지
   - ## 테스트 방법: 리뷰어가 검증할 수 있는 재현 방법
   - ## 리뷰 포인트: 특히 확인 요청할 부분

## 리뷰어 지정 규칙
- 도메인 오너는 CODEOWNERS 기준으로 자동 지정됨
- 아키텍처 변경 시 → @backend-lead 추가 지정 필수
```

> Skills는 서로를 참조할 수 있다. 리팩토링 Skill이 완료 시점에 git-commit Skill을 참조하듯, Skills를 작은 단위로 쪼개고 조합하면 복잡한 워크플로우도 깔끔하게 모듈화할 수 있다.

### rules
`Rules`는 에이전트의 행동에 불변의 제약을 부여한다. `AGENTS.md`가 "어떻게 작업하라"는 가이드라인이라면, rules는 "무슨 일이 있어도 이것만은 지켜라"는 절대 원칙이다.

Claude Code의 경우 `.claude/settings.json` 또는 시스템 프롬프트를 통해 rules를 정의할 수 있다. 일반적으로 다음과 같은 내용이 포함된다.

- 절대 수정하면 안 되는 파일 또는 디렉터리
- 실행 전 사용자 확인이 필요한 위험한 작업 목록
- 외부 API 호출 또는 네트워크 요청 제한
- 특정 커맨드 실행 금지 (e.g., `rm -rf`)
- 출력 형식 및 언어 규칙


**방법 1.** .claude/settings.json

```json
{
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Bash(pnpm:*)",
      "Read(**)"
    ],
    "deny": [
      "Bash(rm:-rf*)",
      "Write(.env)",
      "Bash(curl:*)"
    ]
  }
}
```

**방법 2.** .claude/rules/ 폴더에 지침을 나눠 관리하는 방법

```
.claude/
├── settings.json        # 도구 실행 권한
└── rules/
    ├── code-style.md    # 코드 스타일 규칙 (항상 로드)
    ├── security.md      # 보안 규칙 (항상 로드)
    ├── api.md           # API 규칙 (src/api/ 작업 시만 로드)
    └── database.md      # DB 규칙 (src/db/ 작업 시만 로드)
```

각 파일은 상단 frontmatter의 `paths` 필드로 적용 범위를 지정할 수 있다. `paths`가 없으면 세션 시작 시 항상 로드되는 무조건 규칙이 되고, `paths`를 지정하면 해당 경로의 파일을 다룰 때만 활성화되는 경로 스코프 규칙이 된다.

```md
# .claude/rules/code-style.md  (paths 없음 → 항상 로드)

## 코드 스타일
- 들여쓰기는 스페이스 2칸
- 함수는 40줄을 넘지 않도록 유지, 초과 시 분리
- var 사용 금지, const / let만 허용
- 모든 함수에 TypeScript 반환 타입 명시 필수
```

```md
# .claude/rules/api.md  (paths 지정 → 특정 경로에서만 로드)
---
paths:
  - src/api/**
  - src/handlers/**
---

## API 규칙
- 모든 엔드포인트는 JSDoc으로 request/response 타입 문서화
- 에러 응답은 반드시 { code, message } 구조를 따를 것
- 외부 서비스 호출은 src/api/clients/ 하위에만 작성
- 절대 컨트롤러에서 DB를 직접 쿼리하지 말 것
```

> paths 스코프 규칙은 에이전트가 관련 없는 컨텍스트를 불필요하게 소비하지 않게 해준다. 코드베이스가 커질수록 "항상 로드"되는 규칙은 최소화하고, 도메인별 규칙은 paths로 스코프를 좁히는 것이 좋다.

두 방법은 상호 보완적이다. `settings.json`이 무엇을 할 수 있는가를 제어한다면, `rules` 파일은 어떻게 해야 하는가를 안내한다. 둘을 함께 사용할 때 에이전트는 비로소 신뢰 가능한 팀원이 된다.

## 정리
하네스 엔지니어링은 결국 AI와의 협업 방식을 설계하는 일이다. `AGENTS.md`로 컨텍스트를 제공하고, `Skills`로 노하우를 공유하고, `Rules`로 신뢰의 경계를 만들 때, AI는 비로소 진정한 팀원이 된다.
