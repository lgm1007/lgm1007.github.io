---
layout:	post
title: Spring Boot에 H2 database 연결하여 개발 환경 구축하기
date: 2024-03-22 10:00:15 +0900
sitemap: 
image: technology-3.jpg
author: GyuMyung
tags: technology
comments: true
---

# Spring Boot에 H2 database 연결하여 개발 환경 구축하기
### H2의 필요성
개인 프로젝트를 개발하면서 이전에는 클라우드 서버에 Mysql과 같은 DBMS 환경을 구성한 후, 해당 서버에 연결해서 DB 환경을 구축하여 개발했다. 하지만 이렇게 구성하다보니 개발할 때마다 서버를 실행하고, 서버에 접속해서 DBMS를 ON하고 나서 개발하는 등 개발 시작할 때 번거로운 작업이 있어 불편한 감이 있었다. 또 로컬 환경에는 DBMS를 설치하고 싶지 않을 때 어떻게 개발 DB 환경을 구축할까 찾아보다가 H2 라는 것을 찾게 되었다. 

### H2란?
H2는 **자바로 작성된 관계형 DBMS**이다. 일반적인 DBMS와는 달리 **프로그램 구동 시 메모리(RAM)에 데이터가 저장되는 방식**으로 **인 메모리 DB**(in-memory DB)라는 특징을 가지고 있다. 임베디드 모드와 서버 모드로 구동 가능하며, 브라우저 콘솔 프로그램이라는 특징도 있다. <br/>

### H2의 장점
1. 별도의 설치가 필요 없고 적은 용량을 필요로 하는 등 가볍게 사용 가능하다.
2. 하드 디스크가 아니고 메모리에서 CRUD 연산을 하기 때문에 다른 DBMS 프로그램보다 상대적으로 빠르다.
3. ANSI 표준 SQL로 여러 호환성 모드를 가진다.
    * DB2, MSSQL, Mysql, Oracle, PostgreSQL 등의 기본적인 데이터베이스와 호환 가능
4. 설정이 매우 간단하다.

### H2의 단점
1. 대규모 프로젝트에서는 안정성과 성능이 부족하다.
2. 백업, 복구 등에 대한 기능이 부족하다.
    * 인 메모리 DB 이다 보니 복구 기능이 부족하다.

### Spring Boot에서 H2 사용하기
본격적으로 H2를 사용하는 방법에 대해 다뤄본다. 가장 먼저 의존성을 추가해줘야 한다. <br/>
Maven 의존성 추가 <br/>
```
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

Gradle 의존성 추가 <br/>
```
dependencies {
    runtimeOnly 'com.h2database:h2'
}
```

그리고 application.yml 설정에 H2 관련 설정을 추가해준다. <br/>
```yaml
spring:
  datasource:
    driver-class-name: org.h2.Driver
    # url: 'jdbc:h2:mem:testdb;DATABASE_TO_UPPER=FALSE' # in-memory 모드
    url: 'jdbc:h2:~/testdb;DATABASE_TO_UPPER=FALSE'     # Embedded 모드 
     # DATABASE_TO_UPPER=FALSE 옵션을 붙이지 않으면 모든 테이블, 컬럼 명이 대문자로 출력됨
     # db 이름은 자유롭게 작성 가능
    username: username  # H2 DB 접속 ID (사용자 지정)
    password: password  # H2 DB 접속 PW (사용자 지정)
  h2:
    console:             # H2 DB를 웹에서 관리하는 기능
      enabled: true      # H2 console 사용 여부
      path: /h2-console  # H2 console 접속 주소
  jpa:
    # jpa 연동하고 싶다면 jpa 연동 설정 추가
    database-platform: org.hibernate.dialect.H2Dialect
    hibernate:
     # ddl-auto: create  # jdbc:h2:mem:testdb같이 in-memory DB로 실행할 때 사용하는 초기화 전략
      ddl-auto: update
    properties:
      hibernate:
        dialect: org.hibernate.dialect.H2Dialect
```

위와 같이 설정을 추가한 다음 앱을 실행하면 작성한 Entity 클래스를 대상으로 테이블이 만들어진다. `h2.console.enable: true` 로 설정했다면 앱 실행 후 웹 브라우저에서 DB 관리 페이지로 이동할 수 있는데 주소는 `h2.console.path` 값으로 설정해 준 주소와 같다. <br/>
```
localhost:8080/h2-console
```

접속해보면 다음과 같은 DB 연결 창이 뜨고, `url`, `username`, `password` 값을 설정해 준 값으로 입력 후 Connect 하게 되면 DB 관리 페이지로 접속할 수 있다. <br/>
![h2-connect](https://github.com/lgm1007/lgm1007.github.io/assets/57981691/23398340-1a06-4d86-9c92-e1003c233073)

---
_만약 Spring Security를 적용하고 있고, /h2-console 경로로 접속했는데 연결을 거부했다고 하면서 H2 console에 접속이 안된다면 Security 설정에서 다음 항목들을 추가해야 한다._ <br/>
```java
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SpringSecurityConfig {
   @Bean
   public SecurityFilterChain filterChain(HttpSecurity httpSecurity) throws Exception {
        httpSecurity
                // ...
                // X-Frame-Options 비활성화
                .headers(headersConfig -> headersConfig.frameOptions(
                                HeadersConfigurer.FrameOptionsConfig::disable
                        )
                )
                // ...
                .authorizeHttpRequests(authorizeRequests ->
                        authorizeRequests
                                // H2 console 접근 허용
                                .requestMatchers(PathRequest.toH2Console()).permitAll()
                                // ...
                )
                // ...
       
       return httpSecurity.build();
    }
}
```


