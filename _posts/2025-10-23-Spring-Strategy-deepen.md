---
layout:	post
title: Spring의 Strategy 패턴 심화 - 특정 인터페이스 구현체 주입
date: 2025-10-23 19:57:17 +0900
sitemap: 
image: design-pattern-4.jpg
author: GyuMyung
tags: design-pattern
comments: true
---
전략 패턴에 대한 내용은 [해당 포스팅](https://lgm1007.github.io/2023/08/01/Strategy-Pattern/)에서 확인할 수 있다.

### 요구사항
`Pay` 라는 인터페이스를 구현하는 구현체들 중 특정 조건 별로 구현체를 얻어오는 Strategy 패턴 문제를 해결해보자.

### 내용
`Pay` 인터페이스 정의 및 `Pay` 인터페이스 구현체는 다음과 같다.

```java
public interface Pay {
    void payAmount(int amount);
}

@Component
public class KakaoPay implements Pay {
    @Override
    public void payAmount(int amount) { /* ... */ }
}

@Component
public class NaverPay implements Pay {
    @Override
    public void payAmount(int amount) { /* ... */ }
}

@Component
public class TossPay implements Pay {
    @Override
    public void payAmount(int amount) { /* ... */ }
}
```

임의의 컴포넌트에서 DI 기능을 활용하면 `Pay` 구현체들을 컬렉션 자료구조로 주입받을 수 있다.

```java
@Component
@RequiredArgsConstructor
public class XComponent {
    private final Set<Pay> payHandlers;
}
```

여기서 만약 특정 타입에 따라 특정한 `Pay` 구현체를 선택해 사용하도록 하기 위해서는 구현체의 빈 이름을 정의하고, `Map<String, Pay>` 타입으로 주입받아 처리할 수 있다.

```java
@Component("kakao")
public class KakaoPay implements Pay {
    @Override
    public void payAmount(int amount) { /* ... */ }
}

@Component("naver")
public class NaverPay implements Pay {
    @Override
    public void payAmount(int amount) { /* ... */ }
}

@Component("toss")
public class TossPay implements Pay {
    @Override
    public void payAmount(int amount) { /* ... */ }
}

@Component
@RequiredArgsConstructor
public class XComponent {
    private final Map<String, Pay> payHandlerMap; // key는 빈 이름 ("kakao", "naver", "toss")
    
    public void doPaying(String type, int amount) {
        Pay payHandler = Optional.ofNullable(payHandlerMap.get(type))
            .orElseThrow(() -> new IllegalArgumentException("No pay handler for type: " + type));
        
        payHandler.payAmount(amount);
    }
}
```

위와 같은 동작이 가능한 이유는 Spring에서 DI를 할 때 해석기가 `Map<String, X>`와 같은 타입을 보면 **value 타입 (X)의 모든 빈을 모아두고 key 값에는 빈 이름**으로 채워준다는 규칙을 가지고 있기 때문이다.
