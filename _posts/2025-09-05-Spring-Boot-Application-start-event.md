---
layout:	post
title: Spring Boot 애플리케이션이 시작할 때 이벤트 발생
date: 2025-09-05 11:03:25 +0900
sitemap: 
image: programming-5.jpg
author: GyuMyung
tags: programming
comments: true
---

Spring Boot 애플리케이션을 개발할 때 간혹 애플리케이션이 시작되면서 특정 이벤트를 실행해야 하는 경우가 있다. Spring Boot에서 이러한 작업을 처리하는 2가지 방법을 소개하겠다.

### 1. `CommandLineRunner` 또는 `ApplicationRunner`
`CommandLineRunner` 또는 `ApplicationRunner` 인터페이스를 구현한 Bean 객체를 사용하면 애플리케이션 시작 직후 필요한 작업을 처리할 수 있다.

```kotlin
@Component
class StartupRunner(
    private val exampleService: ExampleService
) : CommandLineRunner {
    override fun run(vararg args: String?) {
        // 애플리케이션 실행 직후 실행됨
        exampleService.doSomething()
    }
}
```

`CommandLineRunner` 또는 `ApplicationRunner` 인터페이스를 구현한 객체에서 `run()` 메서드를 재정의해주면, 해당 메서드에서 작성한 로직들을 애플리케이션이 시작할 때 실행하게 된다.

한 가지 체크할 점은 `CommandLineRunner` 인터페이스와 `ApplicationRunner` 인터페이스 모두 `run()` 메서드를 가지지만, `CommandLineRunner` 인터페이스는 String 배열 인자를 받고, `ApplicationRunner` 인터페이스는 `ApplicationArguments` 인자를 받는다.

### 2. `@EventListener(ApplicationReadyEvent::class)` 사용
스프링 컨테이너가 다 뜨고 애플리케이션이 준비 완료된 시점에 실행되는 방식이다.<br>
사용 방법은 `@EventListener` 어노테이션을 사용하는 이벤트 리스너 객체를 정의해주면 된다.

```kotlin
@Component
class StartupListener(
    private val exampleService: ExampleService
) {
    @EventListener(ApplicationReadyEvent::class)
    fun onApplicationReady() {
        // 애플리케이션 준비 완료된 시점에 실행됨
        exampleService.doSomething()
    }
}
```

위 방식들을 응용하면 조건부 (예: 프로필별) 로 애플리케이션이 시작할 때 특정 이벤트를 실행하도록 할 수도 있다. 만약 특정 이벤트가 DB나 다른 외부 서비스와 연동해야 하는 작업이 있는 경우라면 앱이 완전히 기동된 시점에 작업해야 안전할 것임으로, 그 경우엔 `@ApplicationReadyEvent`를 사용하는 게 가장 적합하다는 의견을 남긴다.

### 번외. 특정 Bean이 초기화될 때 작업 수행
만약 특정 Bean이 초기화될 때 어떤 작업을 처리해야 하는 경우가 있다면, `InitializingBean`을 사용한다.<br>
다만 주의해야 할 점은, 이 방법은 스프링 컨테이너가 완전히 뜨기 전에 실행될 가능성이 있어 DB나 외부 서비스와의 연동이 필요한 작업을 해야하는 경우에는 사용하지 않는 게 좋다.<br>
아래 예제는 `exampleService`라는 Bean이 초기화될 때 작업을 처리하는 예제이다.

```kotlin
@Component
class ExampleInitializer(
    private val exampleService: ExampleService
) : InitializingBean {
    override fun afterPropertiesSet() {
        exampleService.doSomething()
    }
}
```

