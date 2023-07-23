---
layout:	post
title:  Spring-Proxy-AOP-and-@Transactional
date:   2023-07-21 21:29:00 +0900
image:  post-8.jpg
author: GyuMyeong
tags:   Language
comments: true
---
## @Transactional과 AOP, 그리고 프록시 패턴
`@Transactional`에는 Spring AOP의 프록시 패턴을 사용하여 동작합니다. `@Transactional`을 알아가기 앞서 프록시 패턴과 Spring AOP에 대해 알아보겠습니다. <br/>

### 프록시 패턴
프록시 패턴은 객체 지향 디자인 패턴 중 하나로, **다른 객체에 대한 접근을 제어하기 위한 용도**나 **추가적인 기능을 부여**하기 위한 용도로 사용됩니다. <br/>
프록시 객체는 실제 객체의 대리자 같은 역할을 하며, 실제 객체의 동작을 호출하기 전후에 추가적인 로직을 수행할 수 있습니다. <br/>
이를 통해 실제 객체의 동작을 감싸거나 대리할 수 있습니다. <br/>

프록시 패턴은 주로 다음과 같은 상황에서 활용됩니다. <br/>

1. 원격 프록시 (Remote Proxy)
    * 원격 서버에 있는 객체를 로컬에서 접근하기 위한 프록시를 사용합니다.
2. 가상 프록시 (Virtual Proxy)
    * 비용이 큰 객체를 필요할 때까지 생성하지 않고, 대신 가벼운 프록시를 사용하여 성능을 개선합니다.
3. 보호 프록시 (Protection Proxy)
    * 접근 제어를 위해 실제 객체에 대한 접근을 프록시가 제어합니다.
4. 스마트 프록시 (Smart Proxy)
    * 실제 객체에 대한 부가적인 작업을 프록시에서 처리합니다.

다음은 프록시 패턴을 사용한 Spring Boot 예제입니다. <br/><br/>


이미지 파일 로딩을 위한 인터페이스 정의
```java
public interface Image {
    void display();
}
```
<br/>

실제 이미지 파일을 로딩하는 클래스 구현
```java
public class RealImage implements Image {
    private final String filename;

    public RealImage(String filename) {
        this.filename = filename;
        loadFromDisk();
    }

    private void loadFromDisk() {
        System.out.println("Loading " + filename);
    }

    @Override
    public void display() {
        System.out.println("Displaying " + filename);
    }
}
```
<br/>

가상 프록시를 구현하는 클래스
```java
public class ProxyImage implements Image {
    private final String filename;
    private RealImage realImage;

    public ProxyImage(String filename) {
        this.filename = filename;
    }

    @Override
    public void display() {
        if (realImage == null) {
            realImage = new RealImage(filename);
        }
        realImage.display();
    }
}
```
<br/>

테스트를 위한 메인 클래스
```java
public class Main {
    public static void main(String[] args) {
        Image image = new ProxyImage("sample.jpg");

        // 이미지 파일은 실제로 로딩되지 않고, 가상 프록시만 생성됨
        image.display();

        System.out.println("----");

        // 이미지 파일이 실제로 로딩되고 디스플레이됨
        image.display();
    }
}
```
<br/>

위 예제에서 `ProxyImage` 클래스는 실제 이미지가 필요한 시점에만 `RealIamge` 객체를 생성하고, 이미지를 로딩하여 디스플레이하는 방식으로 가상 프록시 패턴을 구현하였습니다. <br/>

또한 실행 결과를 보면 이미지 파일은 `ProxyImage` 클래스에서 `if (realImage == null)` 분기에서 `RealImage` 객체를 생성할 때 `loadFromDisk()` 메서드로 이미지 파일을 한 번만 로딩하는 것을 확인할 수 있습니다. <br/>
이렇게 가상 프록시를 사용하여 비용이 큰 작업을 필요한 시점까지 미루어서 성능을 향상시킬 수 있습니다. <br/>

### Spring AOP

프록시 패턴을 사용하면 원래 코드를 수정하지 않아도 기능을 추가하거나 할 수는 있지만, 프록시 객체에 중복 코드가 발생할 수 있고 다른 클래스에서 동일한 기능을 사용하고자 할 때 매 번 코딩을 해줘야 한다는 점이 있습니다. <br/>

이러한 문제를 해결하고자 해서 나온 게 **런타임 시, 동적으로 프록시 객체를 생성**해주는 (동적 프록시; Dynamic Proxy) Spring AOP 입니다. <br/>
이를 통해 비즈니스 로직과 횡단 관심사 (Cross-cutting concern)를 (로깅, 트랜잭션, 보안 등) 분리할 수 있습니다. <br/>

Spring AOP가 탄생하게 된 더 자세한 이유는 다음과 같습니다. <br/>

1. **중복 코드 제거**
   * 여러 모듈에서 공통으로 사용되는 횡단 관심사가 있을 경우, 이를 분리하지 않고 모든 메서드에 중복해서 적용해야 하는 번거로움을 해소하기 위함입니다.
2. **유지보수성 향상**
   * 횡단 관심사가 변경될 때, 모든 관련 메서드에서 일일이 수정하는 것은 오류를 발생시키거나 많은 시간을 소요할 수 있습니다.
   * AOP를 사용하여 횡단 관심사를 한 곳에서만 관리해 유지보수성이 향상됩니다.
3. **비침투적 설계**
   * AOP는 기존의 비즈니스 로직 코드에 직접적으로 관여하지 않으면서도 횡단 관심사를 추가할 수 있습니다.
   * 따라서 비침투적으로 시스템을 확장할 수 있습니다.

아래 예제는 Spring AOP를 사용하여 메서드 실행 시간을 로깅하는 예제입니다. <br/><br/>


메서드 실행 시간을 로깅하는 Aspect 클래스 정의
```java
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.After;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class LoggingAspect {

    @Around("execution(* com.example.myapp.service.*.*(..))")
    public Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();

        Object result = joinPoint.proceed();

        long endTime = System.currentTimeMillis();
        long executionTime = endTime - startTime;

        System.out.println(
            joinPoint.getSignature() + " executed in " + executionTime + "ms");

        return result;
    }
}
```
<br/>

비즈니스 로직이 있는 서비스 클래스
```java
package com.example.myapp.service;

import org.springframework.stereotype.Service;

@Service
public class MyService {

    public void doSomething() throws InterruptedException {
        // 비즈니스 로직이라고 가정
        Thread.sleep(1000);
    }
}
```
<br/>

테스트를 위한 메인 클래스
```java
package com.example.myapp;

import com.example.myapp.service.MyService;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;

@SpringBootApplication
public class Application {

    public static void main(String[] args) throws InterruptedException {
        ConfigurableApplicationContext context = SpringApplication.run(Application.class, args);
        MyService myService = context.getBean(MyService.class);
        myService.doSomething();
        context.close();
    }
}
```

위 예제에서 `LoggingAspect` 클래스는 `@Aspect` 어노테이션이 붙은 Spring AOP의 Aspect 클래스입니다. `@Around` 어노테이션을 이용하여 `com.example.myapp.service` 패키지에 있는 모든 메서드 실행 시간을 로깅합니다. <br/>

실행 결과를 보면 `MyService` 클래스의 `doSomething` 메서드가 호출되는 데 걸리는 시간을 로그로 출력하는 것을 확인할 수 있습니다. <br/>
이로써 Spring AOP가 동적으로 프록시를 생성하여 비즈니스 로직에 횡단 관심사를 추가하는 것을 확인할 수 있습니다. <br/>

### @Transactional


