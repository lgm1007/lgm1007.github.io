---
layout:	post
title: 화상통화 서비스 구현하기 (1) - 리서치
date: 2025-09-16 14:58:15 +0900
sitemap: 
image: AWS-chime-sdk.png
author: GyuMyung
tags: technology
comments: true
---
화상통화 서비스는 WebRTC 기술을 기반으로 동작한다.<br>
화상통화 기능을 구현하기 위해서는 신호 교환 (Signaling), 세션 관리, TURN/STUN 서버 지원 부분이 필요하다.

## 일반적인 화상통화 서비스 구성
### 1. 신호 교환 (Signaling) 서버 구현
WebRTC 피어 간 직접 연결을 위해서는 SDP (세션 기술 프로토콜)과 ICE Candidate 정보를 교환해야 함
- WebSocket 기반 Signaling 서버 필요
- 예시) `/ws/signal` 엔드포인트에서 방 별로 참가자 연결 관리
- 메시지 타입: `JOIN`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`, `LEAVE` 등

### 2. 세션 관리
어떤 사용자가 어떤 방에 들어왔는지 저장
- 방 생성, 삭제, 사용자 입장/퇴장 이벤트 처리
- 권한 제어 (방에 몇 명까지 참여 가능한지, 방장 권한 등)

### 3. TURN/STUN 서버 정보 제공
- **TURN 서버** (Traversal Using Relays around NAT)
    - 직접 P2P 연결이 불가능할 때, 중계 서버 역할
    - TURN 서버가 모든 미디어 데이터를 중간에 받아서 상대방에게 전달함
    - 네트워크 트래픽이 서버를 거치므로 그만큼 서버 비용/부하 증가
    - 클라우드 서비스 - AWS Chime SDK
- **STUN 서버** (Session Traversal Utilities for NAT)
    - 내 장치의 공인 IP/포트를 알려주는 서버 (외부에서 보이는 주소)
    - 상대방과 직접 P2P 연결할 때 필요
    - 클라이언트의 공인 IP, NAT 매핑 정보를 얻음
    - 무료로 Google STUN 서버 사용 가능
- 클라이언트 접속 시 ICE 서버 목록 내려주기
    - **ICE** (Interactive Connectivity Establishment): STUN/TURN 후보들을 모아서 최적의 연결 경로를 찾는 과정
- 클라이언트는 백엔드로부터 ICE 서버 정보를 받아 `RTCPeerConnection`에 연결해서 연결 시도

```json
{
  "iceServers": [
    { "urls": ["stun:stun.l.google.com:19302"] },
    {
      "urls": ["turn:turn.example.com:3478"],
      "username": "user",
      "credential": "pass"
    }
  ]
}
```

### 4. 인증
WebSocket 연결 시 토큰 검증
- JWT 연동: 유효하지 않은 사용자 연결 차단

## 전반적인 도식
```
React (브라우저)
   │
   │ WebSocket (Signaling)
   ▼
Spring Boot (Signaling Server)
   │
   │ ICE Candidate, Offer/Answer 메시지 타입 교환
   ▼
WebRTC Peer Connection
   │ (직접 P2P or TURN 서버 경유)
   ▼
상대방 브라우저
```

## AWS Chime SDK
WebRTC 기반으로 음성/영상 통화, 채팅 기능을 API/SDK 형태로 제공하는 클라우드 서비스이다.<br>
클라이언트와 백엔드 사이에 AWS Chime 서비스가 **Signaling + TURN 역할**을 대신해 주며, 또한 **다자간 통화** (SFU)도 처리해준다.

### AWS Chime SDK를 사용한 도식
```
브라우저/모바일
   │
   │ 화상통화 접속
   ▼
Spring Boot
   │
   │ AWS Chime SDK 호출 (채팅방 세션/참가자 토큰 발급)
   ▼
React (프론트엔드)
   │
   │ AWS Chime JS SDK 호출 (Chime meeting 세션 생성)
   ▼
화상통화 시작
```
