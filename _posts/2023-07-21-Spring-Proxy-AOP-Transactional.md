---
layout:	post
title:  Transactional과 AOP, 그리고 프록시 패턴
date:   2023-07-21 21:29:00 +0900
image:  technology-24.jpg
author: GyuMyung
tags:   technology
comments: true
---

## @Transactional과 AOP, 그리고 프록시 패턴
`@Transactional`에는 Spring AOP의 프록시 패턴을 사용하여 동작한다. `@Transactional`을 알아가기 앞서 프록시 패턴과 Spring AOP에 대해 알아보도록 한다. <br/>

### 프록시 패턴
프록시 패턴은 객체 지향 디자인 패턴 중 하나로, **다른 객체에 대한 접근을 제어하기 위한 용도**나 **추가적인 기능을 부여**하기 위한 용도로 사용된다. <br/>
프록시 객체는 실제 객체의 대리자 같은 역할을 하며, 실제 객체의 동작을 호출하기 전후에 추가적인 로직을 수행할 수 있다. <br/>
이를 통해 실제 객체의 동작을 감싸거나 대리할 수 있다. <br/>

프록시 패턴은 주로 다음과 같은 상황에서 활용된다. <br/>

1. 원격 프록시 (Remote Proxy)
    * 원격 서버에 있는 객체를 로컬에서 접근하기 위한 프록시를 사용한다.
2. 가상 프록시 (Virtual Proxy)
    * 비용이 큰 객체를 필요할 때까지 생성하지 않고, 대신 가벼운 프록시를 사용하여 성능을 개선한다.
3. 보호 프록시 (Protection Proxy)
    * 접근 제어를 위해 실제 객체에 대한 접근을 프록시가 제어한다.
4. 스마트 프록시 (Smart Proxy)
    * 실제 객체에 대한 부가적인 작업을 프록시에서 처리한다.

다음은 프록시 패턴을 사용한 Spring Boot 예제이다. <br/><br/>


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

위 예제에서 `ProxyImage` 클래스는 실제 이미지가 필요한 시점에만 `RealIamge` 객체를 생성하고, 이미지를 로딩하여 디스플레이하는 방식으로 가상 프록시 패턴을 구현하였다. <br/>

또한 실행 결과를 보면 이미지 파일은 `ProxyImage` 클래스에서 `if (realImage == null)` 분기에서 `RealImage` 객체를 생성할 때 `loadFromDisk()` 메서드로 이미지 파일을 한 번만 로딩하는 것을 확인할 수 있다. <br/>
이렇게 가상 프록시를 사용하여 비용이 큰 작업을 필요한 시점까지 미루어서 성능을 향상시킬 수 있다. <br/>

### Spring AOP

프록시 패턴을 사용하면 원래 코드를 수정하지 않아도 기능을 추가하거나 할 수는 있지만, 프록시 객체에 중복 코드가 발생할 수 있고 다른 클래스에서 동일한 기능을 사용하고자 할 때 매 번 코딩을 해줘야 한다는 점이 있다. <br/>

이러한 문제를 해결하고자 해서 나온 게 **런타임 시, 동적으로 프록시 객체를 생성**해주는 (동적 프록시; Dynamic Proxy) Spring AOP 이다. <br/>
이를 통해 비즈니스 로직과 횡단 관심사 (Cross-cutting concern)를 (로깅, 트랜잭션, 보안 등) 분리할 수 있다. <br/>

Spring AOP가 탄생하게 된 더 자세한 이유는 다음과 같다. <br/>

1. **중복 코드 제거**
   * 여러 모듈에서 공통으로 사용되는 횡단 관심사가 있을 경우, 이를 분리하지 않고 모든 메서드에 중복해서 적용해야 하는 번거로움을 해소하기 위함이다.
2. **유지보수성 향상**
   * 횡단 관심사가 변경될 때, 모든 관련 메서드에서 일일이 수정하는 것은 오류를 발생시키거나 많은 시간을 소요할 수 있다.
   * AOP를 사용하여 횡단 관심사를 한 곳에서만 관리해 유지보수성이 향상된다.
3. **비침투적 설계**
   * AOP는 기존의 비즈니스 로직 코드에 직접적으로 관여하지 않으면서도 횡단 관심사를 추가할 수 있다.
   * 따라서 비침투적으로 시스템을 확장할 수 있다.

아래 예제는 Spring AOP를 사용하여 메서드 실행 시간을 로깅하는 예제이다. <br/><br/>


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

위 예제에서 `LoggingAspect` 클래스는 `@Aspect` 어노테이션이 붙은 Spring AOP의 Aspect 클래스이다. `@Around` 어노테이션을 이용하여 `com.example.myapp.service` 패키지에 있는 모든 메서드 실행 시간을 로깅한다. <br/>

실행 결과를 보면 `MyService` 클래스의 `doSomething` 메서드가 호출되는 데 걸리는 시간을 로그로 출력하는 것을 확인할 수 있다. <br/>
이로써 Spring AOP가 동적으로 프록시를 생성하여 비즈니스 로직에 횡단 관심사를 추가하는 것을 확인할 수 있다. <br/>
<br/>

#### 동적 프록시
동적 프록시를 생성하는 방법은 크게 두 가지가 있다. <br/>
1. **JDK Proxy**
   * Java 표준 라이브러리인 `java.lang.reflect.Proxy` 클래스를 사용하여 인터페이스 기반의 프록시 생성 방식이다.
2. **CGLIB Proxy**
   * CGLIB 라이브러리를 사용하여 클래스 기반의 프록시를 생성하는 방식이다.
   * JDK Proxy와는 달리 인터페이스를 구현하지 않은 클래스에 대해서도 프록시를 생성할 수 있다.

이 중 **JDK Proxy**가 프록시 객체를 생성하는 방식은 다음과 같다. <br/>

1. 타겟이 되는 객체의 인터페이스를 검증해 프록시 팩토리 (Proxy Factory)에 의해 대상의 인터페이스를 상속한 프록시 객체를 생성한다.
2. 프록시 객체에 `InvocationHandler`를 포함시켜 하나의 객체로 반환한다.

이러한 프록시 객체 생성 과정에서 핵심적인 부분은 **인터페이스를 기반**으로 프록시 객체를 생성한다는 점이다. 따라서 대상 객체는 반드시 **인터페이스를 구현**해야 하고, 생성된 프록시 Bean을 사용하기 위해서는 반드시 인터페이스 타입으로 지정해줘야 한다. <br/>

위와 같은 JDK Proxy 방식에 대해 인지하지 못한다면 다음과 같은 실수를 할 수 있다. <br/>

```java
@Controller
public class UserController {
	@Autowired
	private MemeberService memeberService;    // Runtime Error 
}
```
```java
@Service
public class MemberService implements UserService {
	@Override
	public void doSomething() {
       System.out.println("Doing something in MemberService.");
    }
}
```

위 예제에서 `MemberService`는 `UserService` 인터페이스를 구현하고 있기 때문에 JDK Proxy 방식으로 프록시 빈을 생성한다. <br/>
하지만 `@Autowired`로 프록시 Bean을 사용하려는 부분에서 `UserService` 인터페이스 타입이 아닌 `MemberService` 타입으로 작성하여 프록시 객체를 생성할 수 없어 Runtime Error 가 발생한다. <br/>


### @Transactional

우선, `@Transactional`의 동작 원리에 대해 알아보도록 한다. <br/>

`@Transactional`은 AOP를 사용하여 구현된다. AOP를 활용하여 트랜잭션을 시작하고 종료하며, 예외가 발생하면 롤백하는 기능을 제공한다. <br/>

`@Transactional` 동작 원리를 설명하면 다음과 같다. <br/>

1. **AOP와 Proxy**
   * `@Transactional` 어노테이션을 사용하면 Spring은 AOP를 통해 프록시를 생성한다. 해당 프록시는 `@Transactional` 어노테이션이 적용된 메서드를 감싸고, 트랜잭션과 관련된 처리를 수행한다.
   * 즉, 원래 비즈니스 로직 메서드가 호출되기 전에 트랜잭션을 시작하고, 메서드가 정상적으로 종료되면 트랜잭션을 커밋하며 예외가 발생하면 트랜잭션을 롤백한다.
2. **트랜잭션 경계**
   * `@Transactional` 어노테이션이 적용된 메서드가 호출되면, 해당 메서드는 트랜잭션의 경계로 간주한다.
   * 트랜잭션 경계 내에서는 트랜잭션을 시작하고 종료하며, `@Transactional` 어노테이션이 적용되지 않은 메서드를 호출할 때에도 동일한 트랜잭션 내에서 실행된다.
3. **트랜잭션 속성 설정**
   * `@Transactional` 어노테이션은 `propagation`, `isolation`, `readOnly`, `timeout`, `rollbackFor`, `noRollbackFor` 등의 속성을 설정하여 트랜잭션 동작을 세밀하게 제어할 수 있다. 
<br/>

다음은 `@Transactional` 어노테이션을 사용할 때 주의해야 할 점들이다. <br/>

1. **메서드의 가시성**
   * `@Transactional` 어노테이션은 `public` 메서드에 적용되어야 한다. `private` 메서드에는 적용할 수 없다.
2. **예외 처리**
   * `@Transactional` 어노테이션을 사용하는 메서드 내에서 예외가 발생하면 트랜잭션은 롤백된다. 그러나 롤백될 예외를 명시적으로 지정하거나, 롤백을 하지 않을 예외를 지정하는 것도 가능하다. 이를 위해 `rollbackFor`과 `noRollbackFor` 속성을 사용할 수 있다.
3. **자기호출** (메서드 내부에서 메서드를 호출하는 경우)
   * `@Transactional` 어노테이션은 외부 호출로 인한 트랜잭션 경계를 인식하지만, 동일한 클래스 내의 메서드에서 다른 메서드를 호출하는 경우에는 `@Transactional` 어노테이션이 동작하지 않는다. 이 때는 AOP가 동작하지 않으므로, 트랜잭션이 예상대로 동작하지 않을 수 있다.
   * 따라서 `@Transactional` 어노테이션은 각각의 메서드에 직접 적용해야 한다.
   * 아래는 자기호출 문제가 발생하는 예제이다.
   * ```java
     public class MyService {

        @Transactional
        public void doSomething() {
            // 비즈니스 로직
            doSomethingInternal();
        }
     
        public void doSomethingInternal() {
            // 메서드 내부에서 자기호출
            System.out.println("Doing something internally.");
        }
     }
     
     public class Main {
        public static void main(String[] args) {
            ConfigurableApplicationContext context = SpringApplication.run(Application.class, args);
            MyService myService = context.getBean(MyService.class);
     
            // @Transactional이 적용된 메서드를 호출하면 트랜잭션이 동작하지만,
            // doSomethingInternal() 메서드는 같은 클래스 내에서 호출되므로 AOP 프록시가 동작하지 않음
            myService.doSomething();

            context.close();
        }
     }
     ```
4. **새로운 클래스에 정의된 메서드에서의 `@Transactional` 적용**
   * Spring의 AOP는 프록시를 통해 동작하므로 같은 클래스 내에 있는 메서드 간 호출에서는 AOP가 동작하지 않는다.
   * 따라서 `@Transactional` 어노테이션은 각각의 메서드에 직접 적용해야 한다.
   * 아래는 해당 문제에 대한 예제이다.
   * ```java
     @Service
     public class UserService {
	    private final EmailService emailService;
     
        @Autowired
        public UserService(EmailService emailService) {
            this.emailService = emailService;
        }

        @Transactional
        public void createUser(String username) {
            // 사용자 생성 로직
     
            // 환영 이메일 전송
            emailService.sendWelcomeEmail(username);
     
            // 일부러 예외 발생
            throw new RuntimeException("Something went wrong!");
        }
     
        public void deleteUser(String username) {
            // 사용자 삭제 로직
        }
     }
     ```
   * ```java
     @Service
     public class EmailService {

        public void sendWelcomeEmail(String username) {
            // 환영 이메일 전송 로직
        }
     }
     ```
   * 위 예제에서 `@Transactional` 어노테이션이 `createUser` 메서드에서 동작하지 않는다. `@Transactional` 어노테이션은 `EmailService`의 `sendWelcomeEmail` 메서드에 적용되지 않고, 트랜잭션이 시작되지 않는다.
   * 이러한 경우에는 `createUser`와 `sendWelcomeEmail`에 각각 `@Transactional` 어노테이션을 붙여야 한다.
5. **Proxy 객체를 직접 참조할 때**
   * `@Transactional` 어노테이션은 AOP에 의해 프록시로 감싸진 객체에만 동작한다. 따라서 프록시 객체를 직접 참조할 경우 AOP가 동작하지 않을 수 있다.
   * 이러한 경우에는 AOP를 우회하는 방법을 사용하거나, `@Transactional` 어노테이션을 사용하지 않고 직접 트랜잭션을 관리해야 한다. 
<br/>

`@Transactional` 어노테이션은 편리하게 트랜잭션 관리를 할 수 있도록 해주지만, 올바른 사용법과 주의할 점을 알고 사용해야 한다. 트랜잭션 경계를 설정하는 것과 롤백 전략을 제대로 파악하여 사용하는 것이 중요하다. <br/>
