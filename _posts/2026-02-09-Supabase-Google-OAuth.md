---
layout:	post
title: Supabase + Google OAuth 로그인 기능 추가하기
date: 2026-02-09 21:45:17 +0900
sitemap: 
image: programming-16.jpg
author: GyuMyung
tags: programming
comments: true
---

Supabase의 Auth 기능과 Google Cloud OAuth를 연결하여 Google 로그인 기능을 추가하기

### 1. Google Cloud Console: OAuth 클라이언트 ID 생성
- [Google Cloud Console](https://console.cloud.google.com)에 접속해 새 프로젝트 생성

![](https://i.imgur.com/dboYfYR.png)

- API 개요 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID

![](https://i.imgur.com/3bZLyNp.png)
![](https://i.imgur.com/VahazjT.png)

- OAuth 동의 화면을 등록하기 전이므로, OAuth 동의 화면 등록하기 화면으로 이동
    - 사용자 타입 (UserType)을 `외부 (External)`로 선택 후 생성

![](https://i.imgur.com/WaOiE9o.png)

- Google Cloud OAuth 클라이언트 ID 만들기
    - 애플리케이션 유형은 웹 애플리케이션 선택
    - 이름은 프로젝트 명 입력 
    - URI는 프로젝트 URI 입력
    - 승인된 리디렉션 URI은 Supabase의 Callback URL인 `https://[본인의-프로젝트-ID].supabase.co/auth/v1/callback` 입력
    - 생성 시 나오는 Client ID / Client Password 저장해두기

![](https://i.imgur.com/CmYyUiu.png)
![](https://i.imgur.com/Fk83I6t.png)

### 2. Supabase: Google Provider 활성화
- [Supabase 대시보드](https://supabase.com/dashboard)에서 Provider 활성화
    - 대시보드 메뉴의 Authentication → Sign In / Providers 이동
    - Google Provider 선택 → 활성화
    - Google Cloud OAuth Client ID를 만들면서 나온 Client ID / Client Password 입력
    - 해당 화면에서 Supabase의 Callback URL 복사 가능

![](https://i.imgur.com/m5UpwNd.png)
![](https://i.imgur.com/POyV8qW.png)

- URL Configuration 설정에서 Site URL 작성
    - 대시보드 메뉴의 Authentication → URL Configuration → Site URL 입력 (본 예제에서는 `http://localhost:3000` 입력)

![](https://i.imgur.com/IMX4Lrp.png)

> 💡 Google Cloud의 승인된 리디렉션 URI와 Supabase의 Callback URL이 일치해야 redirect_uri_mismatch 에러가 발생하지 않음
