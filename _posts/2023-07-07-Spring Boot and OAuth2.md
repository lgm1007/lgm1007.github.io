---
layout: post
title:  Spring Boot and OAuth2
date:   2023-07-07 19:49:55 +0900
image:  post-6.jpg
author: GyuMyeong
tags:   Reference
comments: true
---
### Spring Boot and OAuth2
이 가이드는 [OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)과 Spring Boot을 사용하여 "소셜 로그인"으로 다양한 작업을 수행하는 샘플 앱을 구축하는 방법을 보여줍니다.<br/>

단순한 단일 공급자 싱글 사인-온 (single-provider single-sign on) 으로 시작하여 [Github](https://github.com/settings/developers) 또는 [Google](https://developers.google.com/identity/protocols/OpenIDConnect) 중에서 인증 공급자를 선택할 수 있는 클라이언트가 작동합니다. <br/>
샘플은 모두 백엔드에 Spring Boot 및 Spring Security를 사용하는 단일 페이지 앱입니다. 또한 모두 프론트 엔드에 일반 jQuery를 사용합니다. 그러나 다른 javascript 프레임워크로 변환하거나 서버 측 렌더링을 사용하는 데 필요한 변경사항은 거의 없습니다. <br/>

모든 샘플은 [Spring Boot의 기본 OAuth 2.0 지원](https://docs.spring.io/spring-boot/docs/current-SNAPSHOT/reference/htmlsingle/#web.security.oauth2)을 사용하여 구현됩니다. <br/>
여러 개의 샘플이 서로 구축되어 각 단계에서 새 기능을 추가합니다: <br/>
* [simple](https://spring.io/guides/tutorials/spring-boot-oauth2/#_social_login_simple) : Spring Boot의 OAuth 2.0 구성 속성을 통해 홈 페이지와 무조건 로그인만 가능한 매우 기본적인 정적 앱입니다(홈 페이지를 방문하면 GitHub로 자동 리디렉션됩니다).
* [click](https://spring.io/guides/tutorials/spring-boot-oauth2/#_social_login_click) : 사용자가 로그인하기 위해 클릭해야 하는 명시적 링크를 추가합니다.
* [logout](https://spring.io/guides/tutorials/spring-boot-oauth2/#_social_login_logout) : 인증된 사용자에 대한 로그아웃 링크도 추가합니다.
* [two-providers](https://spring.io/guides/tutorials/spring-boot-oauth2/#_social_login_two_providers) : 홈 페이지에서 사용할 로그인 공급자를 선택할 수 있도록 두 번째 로그인 공급자를 추가합니다.
* [custom-error](https://spring.io/guides/tutorials/spring-boot-oauth2/#_social_login_custom_error) : 인증되지 않은 사용자에 대한 오류 메시지와 GitHub의 API를 기반으로 한 사용자 정의 인증을 추가합니다.  

각 앱을 IDE로 가져올 수 있습니다. `SocialApplication`에서 `main` 메소드를 실행하여 앱을 시작할 수 있습니다. 모두 http://localhost:8080 에 홈페이지가 나타납니다. (로그인하여 내용을 보려면 GitHub 및 Google 계정이 필요합니다). <br/>
또한 `mvn spring-boot:run`을 사용하거나 jar 파일을 빌드하고 `mvn package` 및 `java -jar target/*.jar` (Spring Boot 문서 및 기타 사용 가능한 설명서에 따라) 를 사용하여 커맨드 라인에서 모든 앱을 실행할 수 있습니다. 만약 최상위 레벨에서 wrapper를 사용한다면 Maven을 설치할 필요가 없습니다. <br/>
```
$ cd simple
$ ../mvnw package
$ java -jar target/*.jar
```
---

앱들은 모두 `localhost:8080`에서 작동합니다. 왜냐하면 그들은 GitHub과 Google에 등록된 OAuth 2.0 클라이언트를 그 주소로 사용할 것이기 때문입니다. 다른 호스트 또는 포트에서 실행하려면 해당 방법으로 앱을 등록해야 합니다. 기본값을 사용하는 경우 localhost를 넘어 자격 증명이 유출될 위험이 없습니다. 그러나 인터넷에 노출되는 내용에 주의하고, 자신의 앱 등록을 공개 소스 제어에 넣지 마십시오.

---





