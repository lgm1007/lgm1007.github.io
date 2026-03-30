---
layout:	post
title: 맥미니에 오픈클로(OpenClaw) 구성 + 디스코드(Discord) 봇 연동
date: 2026-03-30 23:32:07 +0900
sitemap: 
image: technology-23.png
author: GyuMyung
tags: technology
comments: true
---

## 개요

실무에서 한동안 뜨거운 감자였던 오픈클로를 맥미니에 구성하는 업무를 맞게 되었다.  
오픈클로를 구성하고 사내 메신저인 디스코드에 오픈클로 봇을 연동하여, 로그 모니터링 채널에서 에러 로그가 발생할 때 오픈클로에게 git issue를 생성하도록 시키는 작업을 진행했다.  

이번 포스팅에서는 오픈클로를 맥미니에 구성하는 방법과 디스코드 봇을 연동하는 방법에 대해 다뤄보겠다.

## 디스코드 봇 만들기

우선 사내 디스코드 서버에서 봇 앱을 만들어야 한다.  
[디스코드 개발자 포털](https://discord.com/developers/applications)에 접속하여 New Application 클릭 후 봇을 만들어준다.  
그러기 위해서는 디스코드 서버에서 봇을 추가할 수 있는 권한이 필요하다. (서버 관리자 권한 계정으로 진행함)

그리고 애플리케이션 설정 페이지로 이동하는데, OAuth2 메뉴에서 다음 이미지처럼 `bot`, `applications.commands` 권한을 체크한다.

![discord-app-oauth2](https://i.imgur.com/hSHIMlO.png)

그리고 `bot` 권한을 체크하면 아래에 봇 권한 목록이 나오는데, 여기서 `채널 보기`, `메시지 보내기`, `링크 임베드`, `파일 첨부`, `메시지 기록 보기`, `반응 추가` 권한을 체크한다.

![discord-app-bot-permissions](https://i.imgur.com/ldczGLb.png)

이렇게 체크까지 완료하면 아래에 URL이 나오는데 해당 URL을 복사해서 웹 브라우저 주소창에 붙여넣고 접속하면 방금 만든 봇을 디스코드 서버에 추가할 수 있다.  

또한 애플리케이션 설정 페이지의 Bot 메뉴에서 **Reset Token**을 눌러 토큰을 재발급받고, 해당 토큰을 반드시 메모해둔다.

또한 봇 설정 중 **Message Content Intent** 설정은 반드시 활성화해주고, 해당 봇에게 서버의 멤버 목록이나 멤버 상태 변화 관련 이벤트를 받을 수 있게 해주거나 역할에 따라 다른 규칙을 처리하게 하는 등의 설정이 필요하다면 **Server Members Intent** 설정도 활성화해주도록 한다.  

## MacOS 오픈클로 설치

그리고 오픈클로를 설치해주도록 한다.  
오픈클로를 설치하기 전에 Node 버전 22.14 이상이 반드시 설치되어 있어야 한다.  

```shell
curl -fsSL https://openclaw.ai/install.sh | bash
```

그러면 아래와 같이 설치가 진행되는 것을 확인할 수 있다.  

![openclaw-install](https://i.imgur.com/LS9wykL.png)

설치가 진행되면서 LLM 모델을 선택하는 부분이 나온다. 각자 사용하는 모델을 선택해서 연동하면 된다.  
오픈클로가 OpenAI에서 인수하면서 OpenAI 모델과의 연동이 보다 안정적이라는 평이 있어서 나는 OpenAI Codex 모델을 선택했다.  

![openclaw-select-model](https://i.imgur.com/PqohKlm.png)

LLM 모델을 선택하면 다음에는 채널 선택이 나온다. 여기서는 사용할 메신저인 디스코드를 선택한다.  

![openclaw-select-channel](https://i.imgur.com/ka9c4Vq.png)

디스코드 채널을 선택하면 디스코드 봇 토큰을 입력하는 화면이 나온다.  
아까 메모한 디스코드 봇 토큰을 여기에 입력한다.  

![discord-bot-token](https://i.imgur.com/sBgeWN8.png)

채널 선택 후 다음에는 오픈클로 스킬을 선택하는 화면이 나온다.  
여기서는 오픈클로에게 권한을 부여해서 명령을 할 프로그램을 선택한다. (설치 후에도 오픈클로 GUI에서 선택 가능)  
나는 github를 선택했다.  

![openclaw-select-skills](https://i.imgur.com/B5jJiw7.png)

스킬을 선택하고 나면 그 외 `GOOGLE_PLACES_API_KEY`, `NOTION_API_KEY`, `OPENAI_API_KEY for openai-whisper-api`, `ELEVENLABS_API_KEY`를 설정하는 입력창들이 나오는데, 여기서는 다 **No**를 선택해줬다.  

![openclaw-etc-settings](https://i.imgur.com/I2o6mII.png)

그러면 이제 오픈클로를 깨우는 방법을 선택하는 창이 나오는데, 여기서는 `Hatch in TUI`를 선택하면 터미널창에서 `Wake up, my friend!`가 입력되면서 오픈클로가 실행된다.  

![openclaw-hatch](https://i.imgur.com/lYyA3U9.png)

이후에 오픈클로를 실행해야 할 때는 `openclaw gateway run` 명령어로 실행하면 된다.  
이제 실행하면서 뜬 `127.0.0.1:18789` 주소로 접속하면 오픈클로 GUI 화면으로 접속할 수 있다.  

![openclaw-gui](https://i.imgur.com/X7Hsljg.png)

GUI에서 직접 오픈클로랑 채팅을 할 수도 있고, 채널 및 스킬 설정, 게이트웨이 토큰값도 확인할 수 있다.  

이제 디스코드에서 오픈클로를 사용할 차례이다.

## 디스코드 봇과 오픈클로 페어링하기

다시 디스코드로 돌아와서, 아까 만든 봇에게 DM으로 아무 말을 해보자.  
그럼 `access not configured.` 메시지가 뜨면서 페어링 코드가 나온다.  
(만약 봇 설정을 바꾸고 다시 서버에 추가한다면, 해당 페어링 코드가 바뀐다. 그 떈 다시 오픈클로와 페어링 해줘야 한다.)

![discord-pairing-code](https://i.imgur.com/7JHvN04.png)

이제 터미널에서 `openclaw pairing approve discord <페어링 코드>`를 입력하면 디스코드 봇과 오픈클로가 페어링이 된다.  

![openclaw-pairing-approve-discord](https://i.imgur.com/DwiWjLv.png)

페어링 후 다시 디스코드 봇에게 DM으로 말을 걸면 오픈클로가 응답하는 것을 확인할 수 있다.  

![openclaw-discod-bot-response](https://i.imgur.com/v37Dt4R.png)

## 이후 오픈클로 설정

이후 오픈클로에게 다양한 프로그램 권한을 부여하고 명령을 내릴텐데, 오픈클로의 여러 설정들을 편집해야 하는 경우가 생길 것이다.  

이럴 때는 `~/.openclaw` 경로 내에서 `openclaw.json` 설정 파일에서 다양한 설정들을 편집 & 재시작해줘야 한다.  

예시로 디스코드 봇으로 깃허브 명령을 내리기 위해 `gh` 권한을 부여해야 하는데, 그 경우 `openclaw.json` 파일에서 `tools.elevated.enabled`를 true로 변경하고, `tools.elevated.allowFrom.discord` 설정에는 `["디스코드-메시지-발신자-유저-id-123"]` 와 같이 설정해야 한다.  

```json
{
  tools: {
    elevated: {
      enabled: true,
      allowFrom: {
        discord: ["sender-user-id-123"]
      },
    },
  },
}
```
