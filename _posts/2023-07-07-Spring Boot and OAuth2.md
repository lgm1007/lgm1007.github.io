---
layout: post
title:  Spring Boot and OAuth2
date:   2023-07-07 19:49:55 +0900
image:  post-6.jpg
author: GyuMyeong
tags:   Reference
comments: true
---
## Spring Boot and OAuth2
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

각 앱을 IDE로 가져올 수 있습니다. `SocialApplication`에서 `main` 메소드를 실행하여 앱을 시작할 수 있습니다. 모두 http://localhost:8080 에 홈페이지가 나타납니다. (로그인하여 내용을 보려면 GitHub 및 Google 계정이 필요합니다.) <br/>
또한 `mvn spring-boot:run`을 사용하거나 jar 파일을 빌드하고 `mvn package` 및 `java -jar target/*.jar` (Spring Boot 문서 및 기타 사용 가능한 설명서에 따라) 를 사용하여 커맨드 라인에서 모든 앱을 실행할 수 있습니다. 만약 최상위 레벨에서 wrapper를 사용한다면 Maven을 설치할 필요가 없습니다. <br/>
```
$ cd simple
$ ../mvnw package
$ java -jar target/*.jar
```
---

앱들은 모두 `localhost:8080`에서 작동합니다. 왜냐하면 그들은 GitHub과 Google에 등록된 OAuth 2.0 클라이언트를 그 주소로 사용할 것이기 때문입니다. 다른 호스트 또는 포트에서 실행하려면 해당 방법으로 앱을 등록해야 합니다. 기본값을 사용하는 경우 localhost를 넘어 자격 증명이 유출될 위험이 없습니다. 그러나 인터넷에 노출되는 내용에 주의하고, 자신의 앱 등록을 공개 소스 제어에 넣지 마십시오.

---
### Github를 사용한 Single Sign On
인증에 Github를 사용하는 최소 애플리케이션을 만들 수 있습니다. Spring Boot의 자동 구성 기능을 활용하면 해당 작업이 상당히 쉬워집니다. <br/>

#### 새 프로젝트 만들기
먼저 Spring Boot 애플리케이션을 만들어야 하는데, 이 애플리케이션은 여러 가지 방법으로 수행할 수 있습니다. <br/>
가장 쉬운 방법은 https://start.spring.io 으로 이동하여 빈 프로젝트를 생성하는 것입니다. (Web dependency를 시작점으로 선택) <br/>
마찬가지로 명령줄에서 해당 작업을 수행합니다: <br/>
```
$ mkdir ui && cd ui
$ curl https://start.spring.io/starter.tgz -d style=web -d name=simple | tar -xzvf -
```

#### 홈 페이지 추가하기
새 프로젝트에서 `src/main/resources/static` 경로에 `index.html`을 생성합니다. 일부 스타일시트와 JavaScript 링크를 추가하여 결과를 다음과 같이 표시해야 합니다: <br/>

index.html
```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8"/>
    <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
    <title>Demo</title>
    <meta name="description" content=""/>
    <meta name="viewport" content="width=device-width"/>
    <base href="/"/>
    <link rel="stylesheet" type="text/css" href="/webjars/bootstrap/css/bootstrap.min.css"/>
    <script type="text/javascript" src="/webjars/jquery/jquery.min.js"></script>
    <script type="text/javascript" src="/webjars/bootstrap/js/bootstrap.min.js"></script>
</head>
<body>
	<h1>Demo</h1>
	<div class="container"></div>
</body>
</html>
```
이 중 어느 것도 OAuth 2.0 로그인 기능을 시연하는 데 필요하지 않지만, 마지막에는 쾌적한 UI가 있으면 좋을 것이므로 홈 페이지에서 기본적인 것부터 시작하는 것이 좋습니다. <br/>

앱을 시작하고 홈 페이지를 로드하면 스타일시트가 로드되지 않은 것을 알 수 있습니다. 따라서 jQuery와 Twitter Bootstrap을 추가하여 추가해야 합니다: <br/>

pom.xml
```xml
<dependency>
	<groupId>org.webjars</groupId>
	<artifactId>jquery</artifactId>
	<version>3.4.1</version>
</dependency>
<dependency>
	<groupId>org.webjars</groupId>
	<artifactId>bootstrap</artifactId>
	<version>4.3.1</version>
</dependency>
<dependency>
	<groupId>org.webjars</groupId>
	<artifactId>webjars-locator-core</artifactId>
</dependency>
```

마지막 종속성은 webjars 사이트에서 라이브러리로 제공하는 webjars "locator" 입니다. Spring은 정확한 버전을 알 필요 없이 locator를 사용하여 webjars에서 정적 자원들을 찾을 수 있습니다. <br/>
(`index.html`의 버전 없는 `/webjars/**` 링크) <br/>
MVC 자동 구성을 끄지 않는 한 webjars locator는 Spring Boot 앱에서 기본적으로 활성화됩니다. <br/>

이러한 변경 사항이 적용되면, 당신은 당신의 앱을 위한 멋진 홈페이지를 갖게 될 것입니다. <br/>

#### Github 및 Spring Security를 통한 애플리케이션 보안
애플리케이션의 보안을 강화하려면 Spring Security를 종속성으로 추가하기만 하면 됩니다. "소셜" 로그인 (Github 위임) 을 수행하려면 Spring Security OAuth 2.0 Client 스타터를 추가해야 합니다: <br/>

pom.xml
```xml
<dependency>
	<groupId>org.springframework.boot</groupId>
	<artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>
```
이를 추가하면 기본적으로 OAuth 2.0으로 앱을 보호합니다. <br/>

다음으로 Github을 인증 공급자로 사용하도록 앱을 구성해야 합니다. 이 작업을 수행하려면 다음을 수행합니다: <br/>
* [새로운 Github 애플리케이션 추가](#새로운-Github-애플리케이션-추가)
* [application.yml 구성](#application.yml-구성)
* [애플리케이션 부팅](#애플리케이션-부팅)

#### 새로운 Github 애플리케이션 추가
로그인에 Github의 OAuth 2.0 인증 시스템을 사용하려면 먼저 [새 Github 앱을 추가해야 합니다.](https://github.com/settings/developers) <br/>

"New OAuth App"을 선택하면 "Register a new OAuth application" 페이지가 표시됩니다. 앱 이름과 설명을 입력한 후, 앱의 홈 페이지(이 경우 http://localhost:8080)를 입력합니다. 마지막으로, 인증 콜백 URL을 `http://localhost:8080/login/oauth2/code/github` 으로 지정하고 "Register Application"을 클릭합니다. <br/>

OAuth 리디렉션 URI는 최종 사용자의 사용자 에이전트가 Github로 인증되고 인증 애플리케이션 페이지에서 애플리케이션에 대한 액세스 권한을 부여한 후 다시 리디렉션되는 애플리케이션의 경로입니다.

---

기본 리디렉션 URI 템플릿은 `{baseUrl}/login/oauth2/code/{registrationId}` 입니다. *registrationId*는 `클라이언트 등록의 고유 식별자`입니다.

---

#### application.yml 구성
그런 다음 Github에 대한 링크를 만들려면 `application.yml`에 다음을 추가합니다: <br/>
```yml
spring:
  security:
    oauth2:
      client:
        registration:
          github:
            clientId: github-client-id
            clientSecret: github-client-secret
# ...
```
Github으로 방금 만든 OAuth 2.0 자격 증명을 사용하여 `github-client-id`를 클라이언트 ID로, `github-client-secret`을 클라이언트 secret으로 바꾸기만 하면 됩니다. <br/>

#### 애플리케이션 부팅
이렇게 변경하고, 앱을 다시 실행한 후 http://localhost:8080 주소로 홈 페이지를 방문할 수 있습니다. 이제 홈 페이지 대신 Github로 로그인하도록 리다이렉션됩니다. 이 작업을 수행하고 요청된 모든 권한을 수락하면 로컬 애플리케이션으로 다시 리디렉션되고 홈 페이지가 표시됩니다. <br/>

Github에 로그인한 상태를 유지하면 쿠키나 캐시된 데이터가 없는 새로운 브라우저에서 Github를 열어도 이 로컬 애플리케이션으로 다시 인증할 필요 없습니다. (Single Sign On은 이것을 의미합니다.) <br/>

---

샘플 응용프로그램을 사용하여 이 섹션을 수행하는 경우 브라우저 캐시에서 쿠키 및 HTTP 기본 자격 증명을 지워야 합니다. 단일 서버에 대한 가장 좋은 방법은 새 private 창을 여는 것입니다.

---

로컬에서 실행되는 앱만 토큰을 사용할 수 있고 요청하는 범위가 제한되어 있으므로 이 샘플에 대한 액세스 권한을 부여하는 것이 안전합니다. 하지만 다음과 같은 앱에 로그인할 때 무엇을 승인하는지 유의해야 합니다: 이는 사용자를 편하게 하는 것보다 더 많은 작업을 수행할 수 있는 권한을 요청할 수 있습니다. (사용자에게 이익이 될 것 같지 않은 개인 데이터를 변경할 수 있는 권한을 요청할 수 있습니다.) <br/>

#### What Just Happened?
방금 작성한 앱은 OAuth 2.0 용어로 클라이언트 애플리케이션이며, Github(Authorization Server)에서 액세스 토큰을 얻기 위해 [권한 코드 부여](https://datatracker.ietf.org/doc/html/rfc6749#section-4)를 사용합니다. <br/>

그런 다음 액세스 토큰을 사용하여 Github에 로그인 ID 및 이름을 포함한 일부 개인 정보(사용자가 허용한 작업만)를 요청합니다. 이 단계에서 Github는 사용자가 보내는 토큰을 디코딩하고 앱이 사용자의 세부 정보에 액세스할 수 있는 권한을 부여하는지 확인하는 리소스 서버 역할을 합니다. 이 프로세스가 성공하면 사용자가 인증되도록 앱이 Spring Security 컨텍스트에 사용자 세부 정보를 삽입합니다. <br/>

브라우저 도구 (Chrome 또는 Firefox의 F12)를 살펴보고 모든 hops에 대한 네트워크 트래픽을 추적하면 Github로 앞뒤로 리디렉션되고 마지막으로 새로운 Set-Cookie 헤더가 있는 홈 페이지로 돌아갑니다. 이 쿠키(기본적으로 JSESSIONID)는 Spring(또는 서블릿 기반) 애플리케이션에 대한 인증 세부사항에 대한 토큰입니다. <br/>

따라서 사용자가 외부 공급자(Github)를 통해 인증해야 하는 콘텐츠를 확인할 수 있는 안전한 애플리케이션이 있습니다. <br/>

우리는 그것을 인터넷 뱅킹 웹사이트에 사용하고 싶지 않을 것입니다. 그러나 기본적인 식별 목적과 사이트의 다른 사용자 간에 컨텐츠를 분리하는 것은 훌륭한 출발점입니다. 그래서 요즘 이런 인증이 굉장히 인기가 많습니다. <br/>

다음 섹션에서는 애플리케이션에 몇 가지 기본 기능을 추가할 것입니다. 또한 사용자가 Github으로 초기 리디렉션할 때 무슨 일이 일어나고 있는지를 사용자에게 좀 더 분명하게 보여줄 것입니다. <br/>



