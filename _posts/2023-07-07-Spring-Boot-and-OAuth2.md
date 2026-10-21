---
layout: post
title: "Spring Boot OAuth2 로그인: 세션·권한·리다이렉트 경계와 오류 진단"
date: 2023-07-07 19:49:55 +0900
last_modified_at: 2026-10-21
sitemap:
  changefreq: weekly
image: reference-1.jpg
author: GyuMyung
tags: reference
comments: true
description: "Spring Boot의 GitHub OAuth2 로그인을 세션 기반으로 구성하고, 로그인과 권한의 차이, 콜백 URI, CSRF, 사용자 식별 및 실패 단계별 점검 방법을 설명합니다."
---

소셜 로그인을 붙일 때 공급자 로그인 화면까지 이동하면 구현이 거의 끝났다고 생각하기 쉽다. 하지만 이후에도 세 가지 질문이 남는다. **누가 로그인했는가, 그 사용자가 우리 서비스에서 무엇을 할 수 있는가, 브라우저는 다음 요청에서 어떻게 로그인 상태를 증명하는가**다.

이 글은 이 질문들을 분리해 GitHub OAuth2 로그인의 설정과 오류를 살펴본다. 범위는 **Spring Boot 3.x·Spring Security 6.x의 Servlet 애플리케이션**이며, 같은 출처에서 제공하는 웹 화면과 서버가 세션 쿠키를 사용하는 구성을 가정한다. 설명의 기준 문서는 Spring Security 6.5이다. 다른 출처의 SPA, 모바일 앱, 별도의 JWT 인증 서버 구성은 이 예제의 범위에 포함하지 않는다.

> 2026년 10월 21일 개정: 처음 게시한 [Spring 공식 튜토리얼](https://github.com/spring-guides/tut-spring-boot-oauth2) 번역 중심 글을 설정의 판단 기준과 오류 진단 중심으로 재구성했다. Java 17.0.13·Spring Boot 3.5.0·Spring Security 6.5.0에서 예제의 컴파일과 로컬 HTTP 응답을 확인했다. 실제 GitHub 계정 로그인과 운영 환경의 동작은 검증하지 않았다.

## 1. 로그인 성공과 API 사용 권한을 분리하기

예를 들어 사내 문서 서비스에 GitHub 로그인을 추가한다고 하자. GitHub 계정을 가진 모든 사람이 사내 문서를 읽어도 되는 것은 아니다.

| 구분 | 확인하는 것 | 서비스에서 필요한 처리 |
| --- | --- | --- |
| 공급자 인증 | GitHub 계정의 사용자 식별 정보 | 공급자가 제공한 사용자 ID를 받는다 |
| 서비스 회원 연결 | 이 외부 계정이 어떤 내부 회원에 연결되는가 | 외부 계정과 내부 회원을 매핑한다 |
| 서비스 인가 | 이 회원이 이 문서를 읽거나 수정할 수 있는가 | 회원 상태, 역할, 문서 소유권을 검사한다 |

`oauth2Login()`으로 인증되었다는 사실만으로 관리자 권한이나 사내 구성원 자격이 생기지는 않는다. 예를 들어 아래 예제의 `.authenticated()`는 **로그인한 사용자**를 허용할 뿐이다. 사내 서비스로 확장한다면 초대 상태나 조직 자격을 확인하고, 그 결과를 내부 권한 정책으로 연결해야 한다.

또한 OAuth2의 공급자 API 접근 권한과 우리 서비스의 권한은 별개다. GitHub의 `read:user` scope를 받았다는 것은 GitHub 사용자 정보를 읽을 수 있다는 의미이며, 우리 서비스의 관리자가 되었다는 뜻이 아니다.

## 2. 브라우저 세션과 공급자 토큰은 서로 다른 자격 증명이다

세션을 사용하는 서버 애플리케이션의 흐름은 다음과 같이 나눌 수 있다.

```text
브라우저 ── 로그인 시작 ──> 우리 서버 ── 리다이렉트 ──> GitHub
브라우저 <── code·state와 함께 콜백 ────────────────── GitHub
브라우저 ── 콜백 요청 ───> 우리 서버
                            ├─ GitHub와 code를 토큰으로 교환
                            ├─ 사용자 정보 확인
                            └─ 인증 정보를 서버 세션에 연결
브라우저 ── 세션 쿠키 ───> 우리 서버의 후속 요청
```

브라우저가 받는 세션 쿠키와 서버가 GitHub API 호출에 사용하는 access token은 역할이 다르다. 화면에 로그인 정보를 보여주기 위해 access token을 프론트엔드에 반환할 필요는 없다. 공급자 API를 호출해야 한다면 서버에서 인가된 클라이언트를 조회해 사용하고, 응답에는 화면에 필요한 결과만 전달하는 구성을 고려할 수 있다. [Spring의 인가된 클라이언트 처리](https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/client/authorized-clients.html)

이 예제의 세션 방식에서 로그인 상태를 유지하려면 브라우저가 같은 서비스로 후속 요청할 때 세션 쿠키를 보내야 한다. 쿠키가 끊겼는데도 공급자 토큰이나 로그인 코드를 다시 브라우저에 넘기는 식으로 우회하기보다, 도메인·HTTPS·쿠키 속성과 서버의 세션 공유 구성을 확인해야 한다.

## 3. 최소 설정으로 인증 흐름의 기준점 만들기

기존 Spring Boot 3.x 프로젝트에 다음 의존성을 추가한다. 버전은 프로젝트가 사용하는 Spring Boot 의존성 관리에 맡기고, 임의의 Spring Security 버전을 별도로 섞지 않는 구성을 전제로 한다.

```groovy
// build.gradle의 dependencies 블록
implementation 'org.springframework.boot:spring-boot-starter-web'
implementation 'org.springframework.boot:spring-boot-starter-oauth2-client'
```

GitHub의 OAuth App 설정에서 로컬 개발용 Authorization callback URL을 다음과 같이 등록한다.

```text
http://localhost:8080/login/oauth2/code/github
```

`application.yml`에는 서버 환경 변수로 자격 증명을 전달한다.

```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          github:
            client-id: ${GITHUB_CLIENT_ID}
            client-secret: ${GITHUB_CLIENT_SECRET}
            scope:
              - read:user
```

여기서는 사용자 프로필 정보를 읽는 예시로 `read:user`를 지정했다. 이메일이나 저장소 접근을 추가로 사용하지 않으므로 `user:email`, `repo` 같은 scope를 함께 요청하지 않는다. 실제 필요한 정보에 따라 요청 권한을 정해야 한다. GitHub는 scope에 따라 사용자 정보 응답의 범위도 달라진다고 설명한다. [GitHub 사용자 API](https://docs.github.com/en/rest/users/users#get-the-authenticated-user)

등록 ID를 `github`로 사용하면 Spring의 `CommonOAuth2Provider`가 공급자의 기본 엔드포인트 정보를 제공한다. 기본 콜백 경로의 마지막 부분도 이 등록 ID를 사용한다. 등록 ID를 바꾼다면 공급자 설정과 콜백 URI도 함께 확인해야 한다. [Spring OAuth2 Login 기본 설정](https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/login/core.html)

다음 설정 클래스는 메인 애플리케이션의 컴포넌트 스캔 범위에 둔다.

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/", "/index.html", "/error").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(Customizer.withDefaults())
            .logout(logout -> logout.logoutSuccessUrl("/"));

        return http.build();
    }
}
```

여기에는 CSRF 비활성화 설정을 넣지 않았다. 브라우저가 세션 쿠키로 인증하는 서비스에서는 상태 변경 요청에 대한 CSRF 보호를 함께 설계해야 한다. 로그인이 되는지 확인하는 과정에서 보안 설정을 한꺼번에 끄면, 무엇이 문제였는지 구분하기도 어려워진다.

`/index.html`도 공개한 이유는 Boot의 정적 환영 페이지가 `/` 요청을 해당 경로로 전달할 수 있기 때문이다. 위 검증 환경에서는 `/`만 허용하면 전달된 경로가 인증을 요구해 로그인으로 이동했고, `/index.html`을 함께 허용한 뒤에는 공개 홈이 200으로 응답했다.

이제 `src/main/resources/static/index.html`에 로그인 링크를 둔다.

```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><title>로그인 예제</title></head>
<body>
  <a href="/oauth2/authorization/github">GitHub로 로그인</a>
  <a href="/api/me">현재 로그인 정보 확인</a>
  <a href="/logout">로그아웃 확인 화면</a>
</body>
</html>
```

`/oauth2/authorization/github`는 로그인 시작 경로이고 `/login/oauth2/code/github`는 공급자의 응답을 처리하는 콜백 경로다. 둘을 같은 주소로 등록하거나, 콜백을 일반 MVC 컨트롤러로 다시 구현하면 기본 필터 흐름과 충돌할 수 있다. 기본 경로를 바꾸려면 공급자 등록 URI와 Spring의 redirection endpoint 설정을 함께 바꿔야 한다. [Spring OAuth2 Login 고급 설정](https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/login/advanced.html)

## 4. 사용자 정보 응답은 필요한 필드만 만들기

`OAuth2User` 전체를 JSON으로 반환하면 공급자가 추가한 속성까지 응답 계약에 포함된다. 현재 로그인 사용자를 확인하는 예제에서는 다음처럼 필요한 필드만 선택할 수 있다.

```java
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CurrentUserController {

    @GetMapping("/api/me")
    CurrentUser currentUser(OAuth2AuthenticationToken authentication) {
        return new CurrentUser(
            authentication.getAuthorizedClientRegistrationId(),
            authentication.getPrincipal().getName()
        );
    }

    record CurrentUser(String provider, String providerUserId) {}
}
```

예제에서는 공급자별 사용자 식별 값을 보여주지만, 실제 서비스 응답에서는 이 값을 내부 회원 ID로 매핑한 뒤 필요한 프로필만 반환할 수도 있다. `getName()`에 어떤 값이 들어오는지는 해당 공급자의 사용자 이름 속성 설정에 따라 달라지므로, 모든 공급자에서 이메일이 들어온다고 가정하면 안 된다.

회원 연결 키도 표시 이름이나 이메일과 구분하는 편이 안전하다. 예를 들어 GitHub에서는 공급자 사용자 ID를 내부 회원과 연결하고, 화면의 로그인 이름은 별도 프로필로 취급할 수 있다. 여러 공급자를 지원한다면 공급자와 사용자 ID를 함께 관리해야 한다. 같은 이메일이라는 이유로 기존 계정에 자동 연결하는 정책은 별도의 본인 확인 절차와 함께 검토할 대상이다.

## 5. 로그인은 되는데 POST만 403이면 CSRF를 확인하기

이 구성에서는 기본 CSRF 보호가 켜져 있다. 인증된 세션이 있더라도 상태 변경 요청에 필요한 CSRF 토큰이 없으면 거절될 수 있다. 따라서 `403`을 모두 로그인 실패나 OAuth scope 부족으로 해석해서는 안 된다.

서버 템플릿을 사용하는 경우에는 폼에 CSRF 토큰을 포함한다. JavaScript에서 요청을 보낸다면 Spring Security 버전에 맞는 토큰 조회·헤더 전송 방식을 적용해야 한다. 특히 Spring Security 6의 토큰 지연 로딩과 토큰 처리 방식을 고려해야 하므로, 오래된 쿠키 예제를 그대로 섞지 않는 것이 좋다. [Spring CSRF 공식 문서](https://docs.spring.io/spring-security/reference/6.5/servlet/exploits/csrf.html)

로그아웃도 상태 변경이다. 기본 설정에서 `GET /logout`은 확인 화면을 보여주고, CSRF 토큰을 포함한 `POST /logout`이 세션 무효화와 보안 컨텍스트 정리를 수행한다. 우리 서비스에서 로그아웃했다고 GitHub 자체의 로그인 세션까지 종료되는 것은 아니다. 다시 로그인할 때 GitHub 비밀번호 입력이 생략되더라도 서비스 세션이 계속 남아 있었다고 단정할 수 없다. [Spring 로그아웃 처리](https://docs.spring.io/spring-security/reference/6.5/servlet/authentication/logout.html)

## 6. 실패한 단계부터 좁혀가는 점검표

로컬에서는 아래 네 경로를 먼저 확인했다. OAuth 자격 증명에는 예제용 값을 사용했고, GitHub로의 리다이렉트는 따라가지 않았다. 따라서 이 결과는 실제 공급자의 인증·토큰 교환 성공을 뜻하지 않는다.

| 요청 | 로컬에서 확인한 응답 |
| --- | --- |
| `GET /` | 200, 로그인 링크가 있는 정적 페이지 |
| 미인증 `GET /api/me` | 302, 로그인 흐름으로 이동 |
| `GET /oauth2/authorization/github` | 302, GitHub 인가 주소와 로컬 콜백 URI를 포함한 Location 생성 |

이후의 표는 직접 수집한 오류 로그가 아니라 **실패 단계별 진단 순서**다. 브라우저 개발자 도구와 서버 로그에서 어느 단계가 끊겼는지 구분해보자.

| 증상 | 먼저 확인할 것 | 구분할 수 있는 문제 |
| --- | --- | --- |
| 로그인 링크가 404 | 시작 경로의 등록 ID, OAuth2 Client 의존성, 필터 체인 | 공급자로 이동하기 전의 애플리케이션 설정 문제 |
| 공급자에서 redirect URI 오류 | 실제 인가 요청의 `redirect_uri`와 OAuth App 등록값 | scheme·host·port·callback path 불일치 |
| 콜백에서 인가 요청을 찾지 못함 | 로그인 시작과 콜백의 세션 쿠키, 서버 변경 여부 | 세션 유실 또는 여러 서버 사이의 상태 공유 문제 |
| 토큰 교환 단계에서 실패 | client ID·secret의 조합, 공급자 오류 응답 | 다른 환경의 자격 증명 혼용, 잘못된 코드 등 |
| 로그인 후에도 계속 로그인으로 이동 | 응답 쿠키 설정과 다음 요청의 쿠키, 세션 저장 | 인증 성공 이후 로그인 상태 유지 문제 |
| 인증 후 POST만 403 | CSRF 토큰과 서버의 접근 거부 사유 | CSRF 검증 실패 또는 애플리케이션 권한 부족 |
| 사용자 정보의 이메일이 비어 있음 | 공급자의 프로필 공개 설정, 요청 scope, 응답 필드 | 사용자 식별과 연락처 수집을 혼동한 문제 |

OAuth2의 `state` 검증도 별도로 유지해야 한다. `state`는 로그인 요청과 콜백의 연관성을 확인하는 장치이고, 애플리케이션의 일반 POST 요청에 쓰는 CSRF 토큰과 같은 값을 재사용하는 개념은 아니다. GitHub는 인가 요청의 `state`와 PKCE 사용을 권장하므로 실제 도입 환경에서 클라이언트 라이브러리의 지원·설정을 함께 검토한다. [GitHub 인가 흐름](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)

위 최소 설정은 `client-secret`을 사용하는 confidential client이며, PKCE를 명시적으로 활성화하지 않았다. PKCE까지 자동 적용된 예제로 해석하면 안 된다. Spring Security 6.5에서 confidential client에 PKCE를 적용하려면 인가 요청 resolver의 customizer 등 추가 설정을 확인해야 한다. [Spring의 PKCE 적용 조건과 설정](https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/client/authorization-grants.html)

진단 로그를 남길 때에는 실패 단계, 예외 종류, 등록 ID, 서버가 계산한 콜백 URI처럼 원인 분리에 필요한 정보를 우선한다. client secret, access token, authorization code, 세션 쿠키는 로그나 화면에 그대로 남기지 않는다.

## 7. 로컬 예제를 서비스에 적용할 때 추가할 설계

로컬에서 동작하는 설정만으로 운영 준비가 끝나지는 않는다. 다음 사항은 서비스의 배포 방식과 권한 모델에 따라 결정해야 한다.

- **리버스 프록시와 HTTPS**: 외부에서는 HTTPS인데 서버가 HTTP 주소를 콜백으로 생성하는지 확인한다. 신뢰하는 프록시의 전달 헤더 처리와 실제 생성 URI를 함께 점검한다.
- **여러 서버의 세션**: 로그인 시작과 콜백, 이후 API 요청이 서로 다른 서버로 갈 수 있다. 서버 한 대의 메모리에만 상태를 두는 구성이 적합한지 확인한다.
- **내부 회원 상태**: 탈퇴·차단·초대 대기 상태를 공급자 로그인 성공과 별개로 처리한다. 문서별 접근 권한도 매 요청의 정책에 따라 검사한다.
- **공급자 API 사용 범위**: 로그인에 필요한 정보와 추가 API 호출에 필요한 권한을 구분한다. 공급자 토큰을 계속 보관해야 하는 이유와 폐기 시점을 정한다.

이 글의 세션 예제에 `SessionCreationPolicy.STATELESS`를 추가하거나 프론트엔드에 자체 JWT 발급을 붙이려면 인증 상태 전달 방식부터 다시 설계해야 한다. 로그인 시작·콜백·후속 요청에서 사용하는 자격 증명을 먼저 그려보면, 단순한 설정 변경인지 별도 인증 구조가 필요한 변경인지 판단하기 쉬워진다.

## 참고 문서와 개정 범위

초기 학습의 출발점은 [Spring Boot and OAuth2 튜토리얼](https://github.com/spring-guides/tut-spring-boot-oauth2)이었다. 이번 개정에서는 해당 튜토리얼의 단계별 번역을 대체하고, 인증·인가·세션 경계와 실패 단계별 점검을 중심으로 예제와 설명을 새로 구성했다.

- [Spring Security 6.5: OAuth2 Login 기본 설정](https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/login/core.html)
- [Spring Security 6.5: OAuth2 Login 고급 설정](https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/login/advanced.html)
- [Spring Security 6.5: Authorized Client Features](https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/client/authorized-clients.html)
- [Spring Security 6.5: CSRF 보호](https://docs.spring.io/spring-security/reference/6.5/servlet/exploits/csrf.html)
- [Spring Security 6.5: 로그아웃 처리](https://docs.spring.io/spring-security/reference/6.5/servlet/authentication/logout.html)
- [GitHub: OAuth App 인가 흐름](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [GitHub: 인증 사용자 조회 API](https://docs.github.com/en/rest/users/users#get-the-authenticated-user)
