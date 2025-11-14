---
layout:	post
title: Spring Boot STOMP 기반 웹소켓 구독 및 연결 해제 이벤트 처리
date: 2025-09-12 16:45:27 +0900
sitemap: 
image: programming-6.png
author: GyuMyung
tags: programming
comments: true
---

이번 포스팅에서는 Spring Boot 프로젝트에서 STOMP 기반 웹소켓으로 소켓 구독 해제 및 연결 해제 이벤트를 처리하는 방법에 대해 정리해보고자 한다.

## 들어가기 전에, STOMP?
**STOMP** (Simple Text Oriented Messaging Protocol) 는 메시징 프로토콜 중 하나로, 텍스트 기반 프레임을 사용하여 클라이언트와 메시지 브로커 간의 통신을 표준화한다. 주로 메시지 브로커나 Spring WebSocket 같은 서버와 통신할 때 자주 사용된다.

텍스트 기반이라 메시지가 사람이 읽을 수 있는 구조 (헤더 + 바디) 로 표현되며, 클라이언트가 특정 토픽에 구독하면 해당 토픽에 메시지가 발행될 때 알림을 받을 수 있는 Pub/Sub 모델을 지원한다는 특징을 가지고 있다.<br>
프레임 구조로 CONNECT, SEND, SUBSCRIBE, UNSUBSCRIBE, MESSAGE, DISCONNECT 같은 명령어가 있다.

## 웹소켓 클라이언트 세션 관리
STOMP 기반 웹소켓에서 클라이언트 세션 정보를 다루는 방법에는 주로 `StompHeaderAccessor`를 사용한다. `StompHeaderAccessor`는 MessageHeaders를 감싸서 STOMP 관련 속성에 접근할 수 있게 해주는 클래스다. 이를 사용하면 메서드 기반으로 STOMP 정보를 얻을 수 있다.

STOMP 요청 인터셉터를 구현했다면, 특정 소켓 이벤트가 발생할 때 `StompHeaderAccessor`에 `sessionAttributes`로 세션에서 관리할 데이터를 저장할 수 있다.

```kotlin
@Component
class StompChannelInterceptor() : ChannelInterceptor {
    override fun preSend(message: Message<*>, channel: MessageChannel): Message<*>? {
        val accessor = StompHeaderAccessor.wrap(message)
        when (accessor.command) {
            StompCommand.CONNECT -> {// JWT 인증 절차 필요하면 인증 처리}
            StompCommand.SEND, StompCommand.SUBSCRIBE -> {
                accessor.sessionAttributes?.set("userId", // 처리 생략)
            }
            else -> {}
        }
        
        return message
    }
}
```

그리고 이렇게 저장한 `sessionAttributes` 내용을 웹소켓 구독 해제 또는 연결 해제되는 상황에 사용하고 싶다면, 아래와 같이 구독 해제 또는 연결 해제 이벤트 리스너에서 가져와 사용할 수 있다.<br>
(구독 해제 이벤트: `SessionUnsubscribeEvent`, 연결 해제 이벤트: `SessionDisconnectEvent`)

```kotlin
@Component
class StompSubscriptionEventListener {
    // 웹소켓 구독 해제 이벤트 리스너
    @EventListener
    fun handleUnsubscribe(event: SessionUnsubscribeEvent) {
        val accessor = StompHeaderAccessor.wrap(event.message)
        val userId = accessor.sessionAttributes?.get("userId") as? Long
            ?: throw NoSuchSessionAttributesDataException()
            
        // 구독 해제될 때 이벤트 처리 ...
    }
    
    // 웹소켓 연결 해제 이벤트 리스너
    @EventListener
    fun handleDisconnect(event: SessionDisconnectEvent) {
        val accessor = StompHeaderAccessor.wrap(event.message)
        val userId = accessor.sessionAttributes?.get("userId") as? Long
            ?: throw NoSuchSessionAttributesDataException()
            
        // 연결 해제될 때 이벤트 처리 ...
    }
}
```

단순한 웹소켓 서비스라면 위와 같이 구독 해제 이벤트를 처리하면 되겠지만, 만약 여러 웹소켓 채널이 있고 특정 채널에 대한 구독이 해제되는 경우에만 이벤트를 처리해야 하는 상황을 생각해보자. 그러기 위해서는 특정 채널인지 알기 위한 `destination` 값을 소켓 세션 별로 알고 있어야 한다.

먼저 간단하게 구현한다고 하면, `Concurrent Collection` 자료구조를 사용하여 저장하는 방식으로 구현해보자.

```kotlin
@Component
class StompSubscriptionEventListener {
    private val subscriptionMap = ConcurrentHashMap<String, String>()
    
    @EventLisener
    fun handleSubscribe(event: SessionSubscribeEvent) {
        val accessor = StompHeaderAccessor.wrap(event.message)
        val sessionId = accessor.sessionId
        val destination = accessor.destination
        
        // 구독 이벤트에서 sessionId 별 destination 등록
        if (sessionId != null && destination != null) {
            subscriptionMap[sessionId] = destination
        }
    }
    
    @EventListener
    fun handleUnsubscribe(event: SessionUnsubscribeEvent) {
        val accessor = StompHeaderAccessor.wrap(event.message)
        val sessionId = accessor.sessionId
        val destination = subscriptionMap.remove(sessionId)
        
        // destination 활용 처리 ...
    }
}
```

이렇게 `Concurrent Collection`자료구조로 간단하게 구현할 수 있다. 하지만 실제 운영하는 서비스에서 이런 식으로 구현하면 애플리케이션을 재기동한다거나, 다중 서버 환경인 경우에는 데이터 누락 및 불일치 등의 문제가 발생할 수 있다. 그렇기에 외부 데이터 저장 시스템을 사용해야 하는데, 주로 Redis를 많이 채택한다. Redis를 활용한 예제도 구현해보자.

```kotlin
@Component
class StompSubscriptionEventListener(
    // 예제에서는 Redis에서 <String, Any> 타입으로 데이터 저장/관리
    private val redisTemplate: RedisTemplate<String, Any>
) {
    private val ops = redisTemplate.opsForValue()
    
    @EventLisener
    fun handleSubscribe(event: SessionSubscribeEvent) {
        val accessor = StompHeaderAccessor.wrap(event.message)
        val sessionId = accessor.sessionId
        val destination = accessor.destination
        // 구독 이벤트에서 sessionId 별 destination 등록
        if (sessionId != null && destination != null) {
            ops.set(sessionId, destination)
        }
    }
    
    @EventListener
    fun handleUnsubscribe(event: SessionUnsubscribeEvent) {
        val accessor = StompHeaderAccessor.wrap(event.message)
        val sessionId = accessor.sessionId
        val destination = ops.get(sessionId) as? String
        
        // destination 활용 처리 ...
    }
}
```

이렇게 웹소켓의 세션 정보를 활용한 구독 해제나 연결 해제 이벤트는 실시간 채팅 서비스에서 사용자가 채팅방에서 나가는 경우라거나, 온라인 게임에서 매칭 큐에서 빠지도록 하는 등 다양한 서비스에서 여러 형태로 응용이 가능하다.