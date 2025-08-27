---
layout:	post
title: AWS Certificate Manager에서 인증서 발급하고 HTTPS 요청하기
date: 2025-08-22 16:41:37 +0900
sitemap: 
image: infrastructure-2.png
author: GyuMyung
tags: infrastructure
comments: true
---

회사에서 새로운 도메인을 구매하고, https 요청을 할 수 있도록 처리해야 하는 상황이 있었다. 도메인 구매는 가비아에서 미리 구매했고, AWS Route 53에서 호스팅을 관리하고자 한다.

## Certificate Manager에서 인증서 요청
먼저 인증서를 새로 발급받아야 하니 AWS Certificate Manager 콘솔에서 인증서 요청에 들어간다.

![certificate-manager-select-request](https://i.imgur.com/6DTpN8Q.png)

퍼블릭 인증서 요청을 선택하고 다음으로 넘어가자.

![certificate_request_1](https://i.imgur.com/DaDY2J2.png)

다음 설정으로는 내보내기 허용, 검증 방법, 키 알고리즘을 선택하는데 기본으로 설정된 값들로 생성해준다. 여기서 중요한 부분은 검증 방법이 되겠는데, DNS 검증 방법을 권장하는 편이다.

![certificate-request-settings](https://i.imgur.com/C4wOwss.png)

이렇게 요청하게 되면 우선 인증서는 새로 생성된다.<br>
그 다음으로 구매한 도메인으로 Route 53 호스팅 영역을 추가하고, DNS 검증을 위해 레코드를 생성해줘야 한다. 추가한 인증서로 들어가서 Route 53에서 레코드 생성 버튼을 클릭해준다.

![certificate-domain](https://i.imgur.com/qduCxLP.png)

그러면 Rout 53의 호스팅 영역에 유형 CNAME의 레코드가 생성되는 것을 볼 수 있다.

## 번외. 도메인 네임서버 설정
번외로 만약 AWS Route 53에서 호스트를 관리하고자 한다면, 도메인을 구매한 서비스에서 네임서버를 등록해줘야 한다. 구매한 도메인 내용으로 생성한 Route 53 호스팅 영역에 들어가면 유형이 NS인 레코드가 보이고, 값/트래픽 라우팅 대상에 여러 호스팅 값들을 확인할 수 있다.

![aws-route53-hosting](https://i.imgur.com/xvnmxgW.png)

나같은 경우는 가비아에서 도메인을 구매했기 때문에 가비아를 예시로 들겠다. 구매한 도메인 관리 페이지로 들어가면 네임서버 설정 항목이 있다. 이 항목들에 호스트명을 위에서 확인한 값들을 입력해준다.

![nameserver-setting](https://i.imgur.com/JIj5DfO.png)

## 로드밸런서 리스너 설정
이제 https 요청일 때 발급해 준 인증서로 인증해주도록 설정해야 한다. 해당 호스트로 띄워 줄 애플리케이션이 구동 중인 EC2 인스턴스의 로드밸런서 설정에 들어가 443 포트의 리스너 설정이 필요하다.

![load-balancer-listener](https://i.imgur.com/1nXCl5y.png)

다음과 같이 포트 HTTPS:443 에 SSL/TLS 인증서를 새로 발급해 준 인증서로 선택해주면 리스너 설정이 완료된다.
