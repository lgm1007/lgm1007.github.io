---
layout:	post
title: 테스트 컨테이너로 통합 테스트 환경 구축하기
date: 2025-03-31 21:08:07 +0900
sitemap: 
image: technology-16.jpg
author: GyuMyung
tags: technology
comments: true
---

이번에 회사 조직에서 통합 테스트를 위한 환경을 구축하는 과정에서 테스트 컨테이너를 도입하게 되면서, 그 과정을 정리하고자 한다.<br/>
그 전에 왜 통합 테스트 환경으로 테스트 컨테이너를 채택하게 되었는지 배경은 다음과 같다.<br/>

## 왜 테스트 컨테이너를 채택했나?
### H2 인메모리 DB 고려

처음 통합 테스트 환경을 H2를 활용해 구축하려고 했다. 하지만 회사의 프로젝트는 PostgreSQL DBMS에, JPA와 MyBatis 기술 스택을 함께 사용하고 있다.<br/>
바로 이 MyBatis를 사용하는 부분에서 PostgreSQL의 문법으로 작성된 쿼리가 존재했는데, 문제는 H2는 PostgreSQL의 **모든 문법을 지원하지 않았다.**

PostgreSQL의 문법 중 `INSERT ... CONFLICT ON ...` 이 있는데 바로 이 문법이 H2에서 지원하지 않는 문법이었고, 이는 프로젝트에서 Upsert 기능을 위해 많이 사용하고 있어 반드시 실행해야 할 기능이었다.

즉 H2로는 통합 테스트 환경을 구축할 수 없었다. 결국 PostgreSQL 모든 문법을 지원하며 테스트에 독립적인 DB 환경을 활용하여 통합 테스트를 구축할 필요가 있었다.

### 테스트 컨테이너의 특징

위와 같은 문제를 해결하기 위해 가장 적합한 DB 환경으로 테스트 컨테이너를 선택하게 되었다. 그 이유는 테스트 컨테이너의 다음 특징에 있다.

1. 테스트 환경에서 독립적으로 실행되는 컨테이너로, 어떤 환경에서나 동일하게 실행될 수 있어 일관성과 이식성이 뛰어나다.
2. 생명 주기를 지닌 도커 컨테이너를 활용하여 테스트 결과의 멱등성을 보장해줄 수 있다.
3. 다양한 유형의 DBMS를 지원한다.
4. 실제 제품 환경과 유사하게 테스트 환경 구축 가능하다.
5. 테스트 환경 설정을 쉽게 할 수 있다.

## 테스트 컨테이너 환경 구축 과정
### 1. gradle 의존성 추가
```build
testImplementation 'org.springframework.boot:spring-boot-testcontainers'
testImplementation 'org.testcontainers:junit-jupiter'
testImplementation 'org.testcontainers:testcontainers'
testImplementation 'org.testcontainers:postgresql'
testImplementation 'org.testcontainers:jdbc'
```

### 2. 테스트 컨테이너 연결용 클래스
```java
public class ConnectionTestContainer {
    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> postgresql = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    static {
        postgresql.start();
        System.setProperty("spring.datasource.url", postgresql.getJdbcUrl());
        System.setProperty("spring.datasource.username", postgresql.getUsername());
        System.setProperty("spring.datasource.password", postgresql.getPassword());
    }
}
```

### 3. DB  통합 테스트 작성
```java
@TestContainers
@SpringBootTest
class exampleTest {
    // 테스트 작성 ...
}
```
