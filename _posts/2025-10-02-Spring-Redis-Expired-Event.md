---
layout:	post
title: Spring Redis TTL 만료 시 이벤트 처리하기
date: 2025-10-02 20:50:17 +0900
sitemap: 
image: technology-17.jpg
author: GyuMyung
tags: technology
comments: true
---

일반적으로 Redis는 저장한 데이터의 TTL이 만료되어도 아무것도 알려주지 않는다. 하지만 `Keyspace notifications` (키 공간 알림) 설정을 키면 `keyevent` 채널에서 `expired` 이벤트를 발행한다.

### `keyevent` 채널이란?
Redis의 `Keyspace notifications`을 켜면, 키에 어떤 일이 일어났을 때 Pub/Sub 메시지를 전달하는데, 이때 채널 이름 형식이 `__keyevent@<db>__:<event>`인 채널에 발행한다. 예를 들어 DB 0에서 어떤 키가 만료된 경우 다음과 같이 이벤트가 발행한다.

- 채널: `__keyevent@0__:expired`
- 메시지 바디: 만료된 Redis Key 값

### `Keyspace notifications` 설정 켜기
#### 1) 로컬/단일 노드에 Redis 띄워서 사용 시
로컬 환경이거나 단일 노드 환경에 Redis를 직접 띄워서 운영하고 있다면 아래와 같이 `redis-cli`로 설정해줄 수 있다.

```bash
# 현재 설정 확인
redis-cli CONFIG GET notify-keyspace-events

# 만료 이벤트(keyevent)만 받기 (권장)
redis-cli CONFIG SET notify-keyspace-events Ex

# 만료+퇴출(메모리 부족으로 evict)까지 받기
redis-cli CONFIG SET notify-keyspace-events Exe
```

- `E` = keyevent 채널
- `x` = expire 이벤트
- `e` = eviction 이벤트
- `A` = All 이벤트 (켜면 과도한 알림이 생겨 성능에 좋지 않아 권장하지 않음)

#### 2) AWS ElastiCache
만약 AWS ElastiCache 서비스로 캐싱 환경을 구성해 운영하고 있다면, AWS ElastiCache 콘솔의 파라미터 그룹에서 `Keyspace notifications` 설정을 해줄 수 있다.

먼저 AWS ElastiCache 콘솔에서 파라미터 그룹 메뉴로 들어간다.

![elastiCache-parameter-group](https://i.imgur.com/GR9CnGV.png)

그리고 파라미터 그룹 만들기에 들어가 새로운 그룹을 만든 후, 파라미터 값 편집에 들어가 만든 그룹의 파라미터 중 `notify-keyspace-events` 파라미터의 값을 `Ex`로 입력한 후 저장한다.

![elastiCache-notify-keyspace-event](https://i.imgur.com/qlcALxB.png)

이후 운영 중인 ElastiCache의 클러스터에서 수정 후 만들어 준 파라미터 그룹으로 변경해주면 설정 완료다.

![elastiCache-cluster-cache-config](https://i.imgur.com/v0ANsdx.png)

### Spring Boot 에서 Redis 키 만료 이벤트 받기
#### 1) Listener Container 빈 등록
Redis를 사용하고 있다면 의존성 및 Redis 관련 기본 빈 Config 구성은 되어있다고 가정하고, 키 만료 이벤트를 받기 위해 필요한 설정만 다뤄보겠다.

우선 `RedisMessageListenerContainer` 빈을 등록하는 설정을 구성해줘야 한다.

```kotlin
@Bean
fun redisMessageListenerContainer(): RedisMessageListenerContainer {
    val container = RedisMessageListenerContainer()
    container.setConnectionFactory(redisConnectionFactory())
    return container
}
```

#### 2) Redis 키 만료 이벤트 리스너 직접 재정의
`RedisMessageListenerContainer`에 키 만료 이벤트를 등록하고, 키 만료 시 발행되는 이벤트를 구독하는 이벤트를 정의한다.

```kotlin
@Component
class RedisExpirationListener(
    listenerContainer: RedisMessageListenerContainer
) : MessageListener {
    init {
        // 직접 키 만료 이벤트를 listener에 등록
        listenerContainer.addMessageListener(this, PatternTopic.of("__keyevent@*__:expired"))
    }
    
    override fun onMessage(message: Message, pattern: ByteArray?) {
        val expiredKey = message.body.decodeToString()
        
        // 특정 내용의 키에서만 처리하고 싶은 로직일 경우
        if (expiredKey.startsWith("order:payment:")) {
            // 이벤트 로직 생략 ...
        }
    }
}
```

위 예제 코드에서는 `__keyevent@*__:expired`, 즉 DB는 Wild Card로 모든 DB를 대상으로 키가 만료되면 재정의한 `onMessage()` 메서드가 실행된다. 그리고 만료된 키 중 `order:payment:` 라고 시작하는 키에 대해서만 이벤트를 처리하기 위해 `if (expiredKey.startsWith("order:payment:"))` 분기문을 사용했다.

#### 3) RedisKeyExpiredEvent 이벤트 리스너 (가장 간편)
이 방법이 어쩌면 가장 간단하면서 깔끔한 해결법이라고 생각한다. Spring Redis에서 제공하는 `RedisKeyExpiredEvent`를 핸들링하는 이벤트 리스너를 사용하는 방법이다.

```kotlin
@Component
class RedisExpirationEventListener {
    @EventListener
    fun handleRedisKeyExpired(event: org.springframework.data.redis.core.RedisKeyExpiredEvent<*>) {
        val expiredKeyBytes = event.id
        val expiredKey = expiredKeyBytes?.toString(Charsets.UTF_8) ?: return
        
        // 특정 내용의 키에서만 처리하고 싶은 로직일 경우
        if (expiredKey.startWith("order:payment:")) {
            // 이벤트 로직 생략 ...
        }
    }
}
```

2번 예제처럼 `__keyevent@*__:expired`에 대한 이벤트를 직접 구독하는 방식보다 훨씬 간단하면서 깔끔한 방법이지 않나 생각한다. Spring Event 를 사용하듯 `@EventListener`를 사용하면서, 이미 제공하는 `RedisKeyExpiredEvent`를 핸들링하는 이벤트 리스너로 처리하는 방식이라 구현 난이도도 쉽고, "이벤트"라는 관점 분리 측면에서도 적절한 방법으로 보인다.
