---
layout: post
title: "Spring Security 6.1의 deprecated 경고: HttpSecurity를 Lambda DSL로 바꾸기"
date: 2024-04-01 21:30:51 +0900
last_modified_at: 2026-10-21
description: "Spring Security 6.1에서 인자 없는 HttpSecurity 설정 API에 생긴 deprecated 경고의 의미와 Lambda DSL 전환 방법, 변경 후 확인할 인증·인가·CSRF 동작을 정리합니다."
sitemap:
  changefreq: weekly
image: troubleshooting-3.jpg
author: GyuMyung
tags: troubleshooting
comments: true
---

Spring Security 설정을 업데이트하다가 다음과 같은 경고를 만나면, 먼저 **어떤 메서드의 어떤 오버로드가 deprecated인지** 확인해야 한다.

```text
is deprecated and marked for removal
```

Spring Security 6.1에서 바뀐 것은 Java 메서드 체이닝 전체에 대한 규칙이 아니다. `HttpSecurity`의 **인자를 받지 않는 설정 메서드**와 기존 설정 스타일의 `.and()` 등이 제거 예정으로 표시되었고, `Customizer`를 받는 Lambda DSL로 옮기는 것이 핵심이다. 예를 들어 `csrf()`와 `csrf(customizer)`는 이름이 같아도 다른 API다. [Spring Security 6.1 계열 deprecated 목록](https://docs.spring.io/spring-security/site/docs/6.1.x/api/deprecated-list.html)

> 2026-10-21 수정: 이전 글의 “메서드 체이닝을 지양한다”는 설명을 API 오버로드 전환으로 구체화했다. 설정 문법을 바꾸는 과정에서 CSRF와 프레임 보호를 함께 꺼버리던 예제도 보호 기능을 유지하는 예제로 교체했다.

## 버전별로 구분해야 하는 것

| 구분 | 의미 |
| --- | --- |
| Spring Security 6.1 계열 | 기존 일부 설정 API에 제거 예정 경고가 생겼다. 경고 자체가 항상 컴파일 실패를 뜻하지는 않는다. |
| Lambda DSL | 5.2부터 제공된 설정 방식으로, 6.1에서 새로 생긴 문법이 아니다. |
| Spring Security 7 | 기존 설정 방식 대신 Lambda DSL을 사용해야 한다. 6.x에서 전환하면 업그레이드 시 수정할 부분을 줄일 수 있다. |

[공식 마이그레이션 문서](https://docs.spring.io/spring-security/reference/6.5/migration-7/configuration.html)는 람다 블록이 설정 대상의 범위를 분명하게 하고, 블록이 끝나면 다음 `HttpSecurity` 설정을 이어갈 수 있다고 설명한다.

Spring Boot를 사용한다면 Boot 버전과 실제로 선택된 Spring Security 버전도 구분한다. Gradle 프로젝트에서는 다음처럼 해석된 의존성 버전을 먼저 확인할 수 있다.

```sh
./gradlew dependencyInsight --dependency spring-security-config --configuration runtimeClasspath
```

이 글은 Servlet 기반 `HttpSecurity`의 설정 전환 예제다. WebFlux의 `ServerHttpSecurity`, 여러 개의 필터 체인, 별도의 JWT 인증 구성까지 포함한 완성형 보안 설계는 다루지 않는다.

## 기존 설정을 작은 단위로 옮기기

예를 들어 아래는 기존 스타일의 인가 규칙과 HTTP Basic 설정 일부다.

```java
http
    .authorizeHttpRequests()
        .requestMatchers("/health", "/public/**", "/error").permitAll()
        .anyRequest().authenticated()
        .and()
    .httpBasic();
```

Lambda DSL에서는 각 설정의 입력을 람다 또는 `Customizer`로 전달한다.

```java
http
    .authorizeHttpRequests(authorize -> authorize
        .requestMatchers("/health", "/public/**", "/error").permitAll()
        .anyRequest().authenticated()
    )
    .httpBasic(Customizer.withDefaults());
```

`requestMatchers(...).permitAll().anyRequest().authenticated()`처럼 **람다 안의 규칙 체이닝은 그대로 사용한다.** 바깥 설정으로 돌아가기 위한 `.and()`가 없어졌고, HTTP Basic의 기본 설정은 `Customizer.withDefaults()`로 명시했다.

인가 규칙의 순서와 경로는 문법 전환 전에 정리해두면 좋다. 공개 경로의 오타를 고치는 변경과 인증 방식을 바꾸는 변경까지 한 번에 섞으면, 동작이 달라진 원인을 찾기 어려워진다.

## 기본 보호를 유지하는 설정 예제

다음은 `spring-boot-starter-web`과 `spring-boot-starter-security`가 있는 Servlet 애플리케이션에 넣을 수 있는 설정 클래스다. 패키지 선언은 프로젝트에 맞게 추가한다.

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/health", "/public/**", "/error").permitAll()
                .anyRequest().authenticated()
            )
            .httpBasic(Customizer.withDefaults());

        return http.build();
    }
}
```

이 예제는 CSRF 설정을 생략해 기본 보호를 유지한다. 람다 문법으로 전환하기 위해 CSRF를 끌 필요는 없다. Spring Security는 기본적으로 POST와 같은 안전하지 않은 HTTP 메서드에 CSRF 보호를 적용한다. [공식 CSRF 문서](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html)

`/error`는 Boot의 오류 처리 경로다. 아래 로컬 검증에서 이 경로까지 인증을 요구하면 최초 CSRF 거부의 403이 오류 처리 과정에서 401로 바뀌었다. 예제에서는 최초 오류 상태를 확인할 수 있도록 `/error`를 공개했다. 실제 서비스에서는 공개 오류 응답에 내부 예외나 민감한 정보가 포함되지 않는지도 확인한다.

기존 프로젝트가 의도적으로 CSRF를 비활성화했다면 문법 자체는 `csrf(csrf -> csrf.disable())`로 옮길 수 있다. 다만 설정을 복사하기 전에 브라우저가 인증 정보를 자동으로 전송하는지 등 기존 인증 구조를 검토해야 한다. H2 콘솔을 허용하거나 `frameOptions`를 바꾸는 일도 별도의 요구사항이며, deprecated 경고를 없애기 위한 필수 변경은 아니다.

## 설정 후 무엇을 확인할까?

경고가 사라져도 기존 접근 정책이 유지됐는지 확인해야 한다. 아래 컨트롤러는 공개 GET, 인증이 필요한 GET, 인증이 필요한 POST를 나누어 확인하기 위한 예제다.

```java
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SecurityCheckController {

    @GetMapping("/health")
    public String health() {
        return "ok";
    }

    @GetMapping("/public/hello")
    public String publicHello() {
        return "public";
    }

    @GetMapping("/private/hello")
    public String privateHello() {
        return "private";
    }

    @PostMapping("/private/hello")
    public String privatePost() {
        return "posted";
    }
}
```

별도 인증 저장소를 구성하지 않은 Boot 실습 프로젝트라면 로컬 확인용 사용자를 설정할 수 있다. 다음 자격 증명은 실습 전용 예시다.

```yaml
spring:
  security:
    user:
      name: demo
      password: local-demo-password
```

Java 17.0.13·Spring Boot 3.5.0·Spring Security 6.5.0의 별도 로컬 실습 프로젝트에 위 설정과 컨트롤러를 넣어 컴파일·기동한 뒤 응답을 확인했다. 아래 명령은 기본 포트 8080을 사용하는 경우의 형태다. 실제 검증에서는 테스트용 포트를 사용했으며, 외부 인증 저장소나 프록시는 연결하지 않았다.

| 요청 | 확인한 HTTP 상태 | 확인할 정책 |
| --- | --- | --- |
| `curl -i http://localhost:8080/health` | 200 | 공개 경로 |
| `curl -i http://localhost:8080/private/hello` | 401 | 미인증 사용자의 보호 경로 접근 |
| `curl -i -u demo:local-demo-password http://localhost:8080/private/hello` | 200 | 인증 후 GET 접근 |
| `curl -i -u demo:local-demo-password -X POST http://localhost:8080/private/hello` | 403 | 인증 정보가 있어도 CSRF 토큰이 없는 POST는 거부 |

POST의 403을 보고 곧바로 `.csrf(...disable())`을 추가하면, 원래 유지하려던 보호까지 바뀔 수 있다. 인증 성공 여부, 인가 규칙, CSRF 검증을 각각 확인한다. 실제 서비스의 통합 테스트에서도 공개 경로·미인증 요청·인증된 요청·CSRF 유무를 나누어 기대하는 응답을 검증하는 것이 좋다.

이후의 마이그레이션에서는 설정 클래스의 컴파일과 애플리케이션 기동을 확인하고, 기존 테스트를 같은 조건에서 다시 실행한다. 문법이 같은 모양으로 바뀌었는지보다 **기존 요청에 대한 허용·거부 결과가 유지되는지**를 확인하는 것이 중요하다.
