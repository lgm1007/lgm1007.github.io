---
layout:	post
title: 413 Error - Spring Boot 프로젝트의 웹서버 별 파일 업로드 크기 제한 설정
date: 2025-10-14 09:35:30 +0900
sitemap: 
image: troubleshooting-7.jpg
author: GyuMyung
tags: troubleshooting
comments: true
---

### 이슈 내용
`413 Payload Too Large (Request Entity Too Large)`

### 발생 원인
기본적으로 웹 서버는 리소스 사용량을 고려하여 클라이언트가 서버에게 전송하는 최대 데이터 크기를 제한하고 있다. 서비스를 운영하다보면 파일을 업로드해야 하는 상황이 발생하는데, 이 때 전송하려는 최대 데이터 크기가 제한된 경우 업로드하고자 하는 파일의 용량도 전송 데이터에 포함되므로 제한된다.

파일 업로드를 정책에 맞게 하기 위해선 이 전송 데이터 크기를 제한하는 설정을 변경해줘야 하는데, Spring Boot 프로젝트에서 Tomcat 웹 서버로 배포한 환경, 그리고 Nginx 웹 서버로 배포된 환경 각 상황에서 설정 변경 방법을 정리해본다.

### 1. Spring MVC 서블렛 설정
우선 가장 먼저 Spring MVC 서블렛 설정에서 multipart 파일 크기 설정을 해줘야 한다. 설정은 간단하게 `application.yml` 설정 파일에서 내용을 작성해주면 된다.

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 10MB # 단일 파일의 최대 크기
      max-request-size: 50MB # 요청의 최대 크기
```

### 2. Tomcat 웹서버
Tomcat 웹서버 환경이라면 `maxPostSize` 설정값 (POST 요청 본문의 최대 크기) 을 변경해줘야 한다. Spring Boot 프로젝트라면 마찬가지로 `application.yml` 설정 파일에서 내용을 작성해주면 된다.

```yaml
server:
  tomcat:
    max-http-post-size: 50MB
```

Tomcat의 `maxPostSize` 설정값의 기본값은 2MB이다. 또한 설정값은 `MB` 뿐 아니라 `KB` 등의 접미사도 인식한다.

### 3. Nginx 웹서버
Nginx 웹서버 환경이라면 `nginx.conf` 설정 파일에서 `client_max_body_size` 설정으로 전송 데이터의 최대 크기 제한을 설정할 수 있다.

Nginx 설정은 세부적으로 3가지 범위로 설정할 수 있는데 `모든 서버와 경로`, `특정 서버`, `특정 경로` 범위로 설정 가능하다.

#### 1) 모든 서버와 경로
`nginx.conf` 파일 내 **http** 블록 안에서 설정을 작성하면 모든 서버와 경로에 대해 설정된다.

```conf
http {
    client_max_body_size 50M;
}
```

#### 2) 특정 서버
`nginx.conf` 파일 내 **server** 블록 안에서 설정을 작성하면 특정한 서버에 대해 설정된다.

```conf
http {
    // ...
    server {
        client_max_body_size 50M;
    }
}
```

#### 3) 특정 경로
`nginx.conf` 파일 내 **location** 블록 안에서 설정을 작성하면 특정한 경로에 대해 설정된다.

```conf
http {
    // ...
    server {
        // ...
        location /uploads {
            client_max_body_size 50M;
        }
    }
}
```
