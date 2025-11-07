---
layout:	post
title: Spring Boot + MySQL SQLState 08S01 Communications link failure 에러
date: 2025-11-07 11:47:07 +0900
sitemap: 
image: troubleshooting-10.png
author: GyuMyung
tags: troubleshooting
comments: true
---

### 이슈 내용
`SQLState: 08S01` + `Communications link failure` 에러

### 발생 원인
##### 1. JDBC SocketTimeout 시간 초과
- JDBC의 `socketTimeout`은 응답 수신 한도
- 쿼리가 오래 걸리거나, 결과가 크거나 네트워크가 느려 응답 스트림 수신이 오래 걸리는 경우
- 드라이버가 `SocketTimeout` → `08S01` 로 전환

##### 2. 유후 (Idle) 연결 끊김
- **세션 타임아웃**
    - `wait_timeout` / `interactive_timeout`
    - MySQL에서 `SHOW GLOBAL VARIABLES LIKE 'wait_timeout';` 로 확인 가능
    - Spring 앱에서 `maxLifetime` 값이 DB의 `wait_timeout`보다 길면 위험

- **LB/NAT/방화벽의 Idle Timeout**
    - 중간 장비가 오랫동안 패킷 왕복이 없는 연결을 일방적으로 정리
    - LB/방화벽에서 idle timeout 값 확인 (문서 또는 콘솔)
    - Spring 앱에서 `keepaliveTime` 값이 LB idle 보다 길면 위험

##### 3. 일시적 네트워크 끊김
- DNS, 라우팅, 보안장비 (IPS/방화벽) 등에서

### 확인 체크리스트
##### DB 서버 상태
- `SHOW GLOBAL VARIABLES LIKE 'wait_timeout';`
- `SHOW GLOBAL VARIABLES LIKE 'max_connections';` (연결 폭주로 커넥션 내려가는 문제 발생 여부)

##### 네트워크/LB
- 사용하는 LB/NAT/방화벽의 idle timeout 값
- 해당 시간대에 다른 서비스에서도 끊김이 있었는지

##### Spring 애플리케이션 커넥션 풀 설정
- `socketTimeout`: 읽기/쓰기 대기 한도
- `connectTimeout`: DB 서버에서 TCP 연결 성립 대기 한도
- `validation-timeout`: 커넥션 유효 검사 응답 대기 한도
- `keepalive-time`: LB idle 보다 길지 않도록
