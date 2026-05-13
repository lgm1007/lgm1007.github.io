---
layout:	post
title: 브라우저 하네스 macOS 환경설정
date: 2026-05-13 21:12:07 +0900
sitemap:
  changefreq: weekly
image: technology-25.png
author: GyuMyung
tags: technology
comments: true
---

# browser-harness 환경설정하기 (macOS)

## 배경

`browser-harness`는 LLM(Claude 등 에이전트)이 Chrome DevTools Protocol(CDP)을 통해 실제 Chrome 브라우저를 직접 제어할 수 있도록 해 주는 경량 하네스 도구이다. 단일 WebSocket 연결로 에이전트가 직접 브라우저를 조작하며, 부족한 helper 함수를 실행 중에 스스로 작성·확장할 수 있는 "self-healing" 구조를 채택한다.

이 문서는 macOS 환경에서 `browser-harness`를 설치하고 실제 브라우저 조작 테스트까지 수행하는 절차를 정리한다.

- 공식 저장소: <https://github.com/browser-use/browser-harness>


## 사전 요구사항

| 항목 | 요구 버전/조건 |
| --- | --- |
| OS | macOS |
| Python | `>= 3.11` (권장 3.12) |
| Chrome | 최신 Google Chrome (원격 디버깅 허용 필요) |
| 패키지 매니저 | Homebrew (`brew`) |
| Python 환경 관리 | `uv` |

## 설치 절차

### 1. 기본 도구 설치 (git, uv, ripgrep, Chrome)

Homebrew를 최신 상태로 갱신한 뒤 필요한 도구를 설치한다.

```zsh
brew update
brew install git uv ripgrep
brew install --cask google-chrome
```

설치 확인:

```zsh
git --version
uv --version
open -a "Google Chrome"
```

### 2. Python 버전 확인 및 설치

`browser-harness`는 Python `>= 3.11`을 요구한다. 현재 환경의 Python이 그 이하라면 `uv`로 별도 설치한다.

```zsh
uv python install 3.12
```

### 3. browser-harness 저장소 clone 및 설치

임시 작업 디렉터리에서 저장소를 받고 `uv tool`로 전역 설치한다.

```zsh
git clone https://github.com/browser-use/browser-harness
cd browser-harness

uv tool install -e .
command -v browser-harness
browser-harness --version
```

#### `browser-harness` 실행 파일이 PATH에 없을 때

`command -v browser-harness` 가 아무것도 출력하지 않는다면, `uv tool`의 기본 설치 경로(`$HOME/.local/bin`)가 PATH에 포함되어 있지 않은 것이다. zsh 사용자라면 다음과 같이 조치한다.

```zsh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
exec zsh -l

command -v browser-harness
```

#### 개발용 의존성까지 동기화

저장소 내부에 머무르며 개발용 의존성까지 한 번에 동기화하려면 다음을 실행한다.

```zsh
uv sync
```

### 4. Chrome 원격 디버깅 연결

`browser-harness`는 이미 실행 중인 Chrome에 CDP로 붙기 때문에 **Chrome을 먼저 띄우고** 셋업 명령을 실행한다.

```zsh
open -a "Google Chrome"
```

Chrome이 떠 있는 상태에서 다음을 실행한다.

```zsh
browser-harness --setup
```

진행 중 Chrome 화면에 `Remote debugging` 안내 창이 뜨면, 체크박스를 선택한 뒤 **Allow** 를 눌러 원격 제어를 허용한다.

![Remote debugging allow](https://github.com/browser-use/browser-harness/blob/main/docs/setup-remote-debugging.png?raw=true)

> 안내 창이 자동으로 뜨지 않을 경우, 주소창에 `chrome://inspect/#remote-debugging` 을 직접 입력하여 접속한 뒤 **Allow** 체크박스를 활성화한다.

#### 연결 상태 점검

원격 디버깅이 정상적으로 붙었는지 확인한다.

```zsh
browser-harness --doctor
```

## 실제 브라우저 페이지 조작 테스트

설치와 연결이 끝나면 `-c` 옵션으로 짧은 스크립트를 실행하여 동작을 확인한다. 아래 예시는 새 탭에서 공식 저장소 페이지를 열고 로딩이 끝난 뒤 페이지 정보를 출력한다.

```zsh
browser-harness -c '
new_tab("https://github.com/browser-use/browser-harness")
wait_for_load()
print(page_info())
'
```

기대 동작:

1. Chrome에 새 탭이 열리고 지정한 URL이 로드된다.
2. 페이지 로딩 완료까지 대기한다.
3. 현재 페이지의 메타 정보(`page_info()` 결과)가 터미널에 출력된다.
