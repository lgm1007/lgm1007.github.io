---
layout:	post
title: Spring RedisTemplate 조회 중 역직렬화 이슈
date: 2025-09-26 14:40:51 +0900
sitemap: 
image: troubleshooting-6.jpg
author: GyuMyung
tags: troubleshooting
comments: true
---

### 배경
Spring에서 RedisTemplate를 활용해 Redis 저장소에 데이터를 저장∙조회할 땐 RedisTemplate 설정에서 정의한 대로 Key:Value 값을 직렬화∙역직렬화한다. `RedisTemplate<String, ExampleObject>`와 같이 Value 값을 특정한 타입으로 정의한 경우에는 문제가 되지 않지만 `RedisTemplate<String, Any>` (`RedisTemplate<String, Object>`) 와 같이 정의하게 되면 Value 값을 조회할 때 역직렬화 이슈가 발생할 수 있다.

### 원인
보통 Spring에서 `RedisTemplate<String, Any>` (`RedisTemplate<String, Object>`) 에 대한 설정에 `GenericJackson2JsonRedisSerializer`를 사용하여 정의한다.

```kotlin
@Bean
fun redisTemplate(): RedisTemplate<String, Any> {
    val template = RedisTemplate<String, Any>()
    template.setConnectionFactory(redisConnectionFactory())
    
    template.keySerializer = StringRedisSerializer()
    template.valueSerializer = GenericJackson2JsonRedisSerializer()
    template.hashKeySerializer = StringRedisSerializer()
    template.hashValueSerializer = GenericJackson2JsonRedisSerializer()
    return template
}
```

이렇게 정의한 RedisTemplate에서 저장된 값을 `get()` 해올 때 타입은 `Any` 타입으로 반환되는데, 내부적으로는 `LinkedHashMap`으로 역직렬화된다. 따라서 단순 타입 캐스팅을 하게 되면 캐스팅이 실패하고 `null`로 처리되는 이슈가 발생한다.

```kotlin
// 캐스팅이 실패되어 exampleValue 변수에는 null이 담긴다.
val exampleValue = redisTemplate.opsForValue().get(redisKey) as? ExampleObject
```

### 해결 방법
크게 두 가지 방법이 있다.<br>
하나는 특정 타입으로 고정된 RedisTemplate을 설정해 사용하는 방법이다.

```kotlin
@Bean
fun exampleRedisTemplate(): RedisTemplate<String, ExampleObject> {
    val template = RedisTemplate<String, ExampleObject>()
    template.setConnectionFactory(redisConnectionFactory())
    
    template.keySerializer = StringRedisSerializer()
    template.valueSerializer = Jackson2JsonRedisSerializer(ExampleObject::class.java)
    return template
}
```

만약 특정 타입으로 고정된 RedisTemplate를 설정하지 못하는 경우라면, `ObjectMapper`를 활용하여 타입을 변환하는 방법이 있다.

```kotlin
private val objectMapper: ObjectMapper

// ...
val redisValue = redisTemplate.opsForValue().get(redisKey)
val exampleObject = objectMapper.convertValue(redisValue, ExampleObject::class.java)
```
