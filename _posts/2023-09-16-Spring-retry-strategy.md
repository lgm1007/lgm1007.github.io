---
layout:	post
title:  Spring Boot 에서의 재시도 수행 전략
date:   2023-09-16 12:06:00 +0900
image:  language-2.png
author: GyuMyung
tags:   language
comments: true
---
## Spring Boot 에서의 재시도 수행 전략

Spring Boot 에서 예외 발생 시 메서드 재시도를 수행하는 전략은 애플리케이션에서 예외 처리를 개선하고 내결함성을 향상시키는 중요한 부분이다. <br/>

Spring에서는 이를 위해 다양한 방법을 제공하고 있으며, 주로 다음에 설명하는 전략들을 주로 사용한다. <br/>

### RetryTemplate 를 사용한 재시도

Spring의 `RetryTemplate`는 메서드 실행 중에 예외가 발생할 경우 지정된 횟수만큼 재시도할 수 있게 해준다. <br/>

`@Retryable` 어노테이션을 통해 메서드에 적용할 수 있다. <br/>

```java
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;

@Service
public class MyService {

    @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 1000))
    public void retryMethod() {
        // 예외가 발생할 수 있는 작업 수행
    }
}
```

### Spring Retry 프레임워크를 사용한 재시도

Spring Retry 프레임워크는 Spring Boot와 통합되며, 메서드 레벨에서 재시도 전략을 정의할 수 있다. <br/>

XML 또는 Java 구성을 사용하여 설정할 수 있다. <br/>

```java
import org.springframework.retry.annotation.Retryable;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;

public class MyService {
    public void retryMethod() {
        RetryTemplate retryTemplate = new RetryTemplate();

        SimpleRetryPolicy retryPolicy = new SimpleRetryPolicy();
        retryPolicy.setMaxAttempts(3);

        retryTemplate.setRetryPolicy(retryPolicy);
        retryTemplate.setBackOffPolicy(new FixedBackOffPolicy());
        retryTemplate.execute(context -> {
            // 예외가 발생할 수 있는 작업 수행
            return null;
        });
    }
}
```

RetryTemplate 및 Spring Retry는 **단일 메서드 내에서의 예외 처리**에 유용하다. <br/>

### Circuit Breaker 패턴

Circuit Breaker 패턴은 예외가 발생할 때 일정 횟수 이상의 연속된 재시도 시도를 막고, 일정 시간 동안 예외가 발생하지 않을 때 다시 시도하도록 하는 패턴이다. <br/>

Spring Boot 에서는 Netflix의 Hystrix 라이브러리나 Resilience4j 라이브러리를 사용하여 구현할 수 있다. <br/>

**Resilience4j를 사용한 Circuit Breaker 예제**
```java
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.stereotype.Service;

@Service
public class MyService {

    @CircuitBreaker(name = "myService", fallbackMethod = "fallbackMethod")
    public void circuitBreakerMethod() {
        // 예외가 발생할 수 있는 작업 수행
    }

    public void fallbackMethod(Throwable t) {
        // Circuit Breaker가 열린 경우 실행할 대체 로직
    }
}
```

Circuit Breaker 패턴은 특히 **분산 시스템**에서 유용하다. <br/>

<br/>
이러한 전략들은 예외 처리 및 재시도를 더욱 효과적으로 관리하고 애플리케이션 내결함성을 높이는 데 도움을 준다. 어떤 전략을 사용할지는 프로젝트 요구사항과 선호도에 따라 다를 수 있다. <br/>
