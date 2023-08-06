---
layout:	post
title:  템플릿 콜백 패턴 이해
date:   2023-08-06 14:54:00 +0900
image:  post-16.jpg
author: GyuMyeong
tags:   Language
comments: true
---
## 템플릿 콜백 패턴의 이해

템플릿 콜백 패턴은 전략 패턴의 일종으로, 전략 패턴에서는 클라이언트가 전략 객체를 선택하고 호출하는 방식이지만, 템플릿 콜백 패턴에서는 **특정 알고리즘(콜백)을 포함한 템플릿 메서드를 호출**하고, **클라이언트가 필요한 콜백을 구현하여 전달**하는 방식입니다. <br/>

즉, 템플릿 콜백 패턴은 **전략 패턴의 구현 방법 중 하나**라고 할 수 있습니다.

### 템플릿 콜백 패턴을 사용한 예제

앞전의 [전략 패턴의 이해 포스트](https://lgm1007.github.io/2023/08/01/Strategy-Pattern/)에서 소개한 예제를 템플릿 콜백 패턴을 사용하여 재작성한 예제입니다. <br/>
<br/>

컨텍스트
```java
public class ShoppingCart {
	
	// 템플릿 메서드 - 결제 처리 흐름 정의
    public void checkout(int amount, PaymentCallback paymentCallback) {
		System.out.println("물건 총 가격: %d원".formatted(amount));
		paymentCallback.pay(amount);
    }
}
```
<br/>

콜백 인터페이스
```java
public interface PaymentCallback {
	void pay(int amount);
}
```
<br/>

콜백 구현
```java
public class CreditCardPayment implements PaymentCallback {
	
	@Override
    public void pay(int amount) {
		System.out.println("신용카드로 %d원 결제합니다.".formatted(amount));
    }
}

public class PayPalPayment implements PaymentCallback {
	
	@Override
    public void pay(int amount) {
		System.out.println("페이팔로 %d원 결제합니다.".formatted(amount));
    }
}
```
<br/>

실행
```java
public class Main {
	public static void main(String[] args) {
		ShoppingCart cart = new ShoppingCart();
		
		// 신용카드로 결제하는 콜백 전달
        cart.checkout(10000, new CreditCardPayment());
		
		// 페이팔로 결제하는 콜백 전달
        cart.checkout(20000, new PayPalPayment());
    }
}
```
<br/>

실행 결과
```
물건 총 가격: 10000원
신용카드로 10000원 결제합니다.

물건 총 가격: 20000원
페이팔로 20000원 결제합니다.
```
<br/>


위의 예제에서 `ShoppingCart` 클래스의 `checkout` 메서드는 결제 처리 흐름을 정의한 템플릿 메서드입니다. 이 템플릿 메서드는 클라이언트가 전달한 `PaymentCallback` 인터페이스를 호출하여 결제 처리를 수행합니다. <br/>
따라서 클라이언트는 `PaymentCallback` **인터페이스를 구현하는 객체**(콜백)을 만들어서 `checkout` 메서드에 전달함으로써 원하는 결제 방식을 선택할 수 있습니다. <br/>

전략 패턴에서와 같이 결제 방법을 선택하는 로직을 클라이언트가 직접 처리하는 대신, 템플릿 콜백 패턴에서는 결제 처리 흐름을 미리 정의해 둔 `checkout` 메서드를 호출하여 콜백을 이용하여 동작을 확장하고 변화시킬 수 있습니다. <br/>
이로써 결제 처리 로직과 클라이언트 코드가 분리되어 결합도가 낮아지고, 유연한 코드를 작성할 수 있게 됩니다. <br/>

