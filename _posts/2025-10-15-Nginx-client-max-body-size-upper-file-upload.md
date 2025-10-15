---
layout:	post
title: Nginx client_max_body_size가 10m인데 10MB 넘는 파일이 업로드가 된다?
date: 2025-10-15 16:35:30 +0900
sitemap: 
image: troubleshooting-9.jpg
author: GyuMyung
tags: troubleshooting
comments: true
---

### 이슈 내용
Nginx 웹서버를 사용하는 환경에서 배포하고 있는 프론트엔드와 백엔드 서비스가 있다. 두 서비스에서의 Nginx `client_max_body_size`는 **10m**으로 설정되어 있다. 하지만 막상 **10MB**가 넘는 파일도 업로드가 될 때가 있다. 이러한 현상이 가능한 이유를 알아본다.

### 발생 원인
Nginx의 `client_max_body_size` 설정의 **m** 단위는 파일 용량의 **MB** 단위와 다르다. 실제로 **m** 단위는 **MiB**로, **10MiB = 10 × 1,048,576 = 10,485,760 bytes** 의 용량을 의미한다. 그래서 **10MB**가 넘는 용량의 파일이더라도 실제 바이트로는 **10,485,760 bytes** 이하일 수 있어서 업로드가 성공했을 수 있다.

게다가 [이전 포스팅](https://lgm1007.github.io/2025/10/14/413-Payload-Too-Large-Error/) 내용에서도 언급했다시피 `client_max_body_size` 설정은 `nginx.conf` 파일에서 **http**, **server**, **location** 어디에나 둘 수 있고 더 구체적인 설정인 **location** 설정에 우선한다. 즉 우선순위에 따른 설정 미적용 문제도 확인해야 한다. 아래는 실제로 발생 가능한 원인들을 정리해봤다.

#### 1) MB와 MiB의 단위 차이
위에서 잠깐 설명한 것처럼 Nginx의 `client_max_body_size` 설정은 **m (MiB)** 기준이다. 따라서 실제 **10MB** 용량이 넘는 파일로 보이더라도 실제 바이트로는 **10,485,760 bytes** 이하일 수 있어 제한을 통과한다.

실제로 파일 크기를 bytes 단위로 확인해보면 빠른 확인이 가능하다.

```bash
# macOS
stat -f "%z bytes" yourfile

# Linux
stat -c "%s bytes" yourfile
```

#### 2) 설정의 적용 범위 우선순위
Nginx의 `client_max_body_size` 설정은 **http**, **server**, **location** 범위 어디에나 둘 수 있고, 더 구체적인 **location** 설정이 우선이다. 만약 업로드에 대한 엔드포인트 location에 10m 보다 더 큰 값이 설정되어 있다면, 해당 경로만 예외로 처리될 수 있다.

직접 SSH를 통해 웹서버가 동작하는 서버로 접속하여 실제 로드된 Nginx 설정을 확인하는 방법으로 설정이 어떻게 정의되어 있는지 확인할 수 있다.

```bash
# 현재 프로세스가 사용 중인 설정 전체 출력
nginx -T | grep -n client_max_body_size
```

#### 3) 요청 경로가 해당 Nginx를 안 거치는 경우
프론트엔드 측 Nginx가 업로드 요청을 직접 **S3나 다른 업스트림**으로 대신 전달하는 경우라면, 백엔드 Nginx의 설정은 적용되지 않는다.

전형적인 구조라면 아래와 같은 흐름일 것이다.

```
클라이언트 → 프론트엔드 Nginx → 백엔드 Nginx → 앱 서버
```

이런 경우 두 군데의 `client_max_body_size`가 모두 영향을 줄 수 있다. 하지만 다른 업스트림으로 전달하는 경우는 아래와 같은 흐름이다.

```
클라이언트 → 프론트엔드 Nginx ─────────→ 파일 전송 전용 서비스 OR S3
```

이러한 흐름이라면 백엔드 Nginx는 거치지 않는 구조가 되므로 백엔드 Nginx `client_max_body_size` 설정에 영향을 받지 않는다.

#### 4) 설정 변경이 실제로 반영되지 않음
`nginx.conf` 설정 파일을 수정했지만 `nginx -s reload` 또는 서비스 재시작을 안 했다는 등 실제로 설정 변경이 반영 안 되었을 수도 있다.

### 마무리
`client_max_body_size`가 **10m**으로 설정되어 있는데 **10MB**가 넘는 파일이 업로드되는 경우 bytes 기준으로 파일의 용량을 확인해보고, Nginx 설정의 우선 순위대로 잘 적용되어 있는지도 검토하자.
