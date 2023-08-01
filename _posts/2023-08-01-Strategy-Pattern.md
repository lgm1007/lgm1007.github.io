---
layout:	post
title:  전략 패턴 패턴 이해
date:   2023-08-01 19:57:00 +0900
image:  post-5.jpg
author: GyuMyeong
tags:   Language
comments: true
---
## 전략 패턴의 이해

**비슷한 동작을 하지만 다르게 구현되어 있는 행위**(전략)들을 공통의 인터페이스를 구현하는 각각의 클래스로 구현하고, 동적으로 바꿀 수 있도록 하는 패턴입니다. <br/>
전략 패턴으로 구현된 코드는 **직접 행위에 대한 코드를 수정할 필요 없이 전략만 변경하여 유연하게 확장**할 수 있습니다. <br/>

### 전략 패턴의 구조
1. **전략 인터페이스** (Strategy Interface)
    * 여러 전략 클래스들의 공통 인터페이스를 정의합니다.
    * 해당 인터페이스는 알고리즘을 캡슐화하는 메서드를 정의합니다.
2. **전략 클래스** (Concrete Strategies)
    * 전략 인터페이스를 구현한 각각의 전략 클래스입니다.
    * 서로 다른 알고리즘을 구현합니다.
3. **컨텍스트** (Context)
    * 전략 패턴을 사용하는 클라이언트입니다.
    * 전략 인터페이스를 통해 전략 클래스를 호출합니다.

### 전략 패턴 예제

아래 예제는 전략 패턴을 사용한 예제와 사용하지 않았을 때의 예제입니다. <br/>

#### 전략 패턴을 사용한 예제

전략 인터페이스
```java
public interface PaymentStrategy {
	void pay(int amount);
}
```
<br/>

전략 클래스
```java
public class CreditCardPayment implements PaymentStrategy {
	
	@Override
    public void pay(int amount) {
		System.out.println("신용카드로 %d원 결제합니다.".formatted(amount));
    }
}

public class PayPalPayment implements PaymentStrategy {	

	@Override
    public void pay(int amount) {
		System.out.println("페이팔로 %d원 결제합니다.".formatted(amount));
    }
}
```
<br/>

컨텍스트
```java
public class ShoppingCart {
	private PaymentStrategy paymentStrategy;
	
	public void setPaymentStrategy(PaymentStrategy paymentStrategy) {
		this.paymentStrategy = paymentStrategy;
    }
	
	public void checkout(int amount) {
		paymentStrategy.pay(amount);
    }
}
```
<br/>

실행 결과
```java
ShoppingCart cart = new ShoppingCart();

cart.setPaymentStrategy(new CreditCardPayment());
cart.checkout(10000);   // 신용카드로 10000원 결제합니다.

cart.setPaymentStrategy(new PayPalPayment());
cart.checkout(20000);   // 페이팔로 20000원 결제합니다.
```

#### 전략 패턴을 사용하지 않은 예제

```java
public class ShoppingCart {
	public void checkout(int amount, String paymentMethod) {
		if (paymentMethod.equals("CreditCard")) {
			System.out.println("신용카드로 %d원 결제합니다.".formatted(amount));
		} else if (paymentMethod.equals("PayPal")) {
			System.out.println("페이팔로 %d원 결제합니다.".formatted(amount));
		} else {
			System.out.println("지원하지 않는 결제 방법입니다.");
		}
    }
}
```
<br/>

전략 패턴을 사용하지 않은 경우에는 결제 방법을 if-else 문으로 처리해야 합니다. 하지만, 전략 패턴을 사용하면 컨텍스트(`ShoppingCart`)는 단순히 인터페이스를 통해 결제를 처리하며, 실제로 어떤 결제 전략이 사용되는지는 클라이언트에서 결정됩니다. <br/>
이로써 코드의 유연성과 재사용성이 높아지고, 새로운 결제 방법이 추가되거나 변경되더라도 컨텍스트 코드를 수정할 필요가 없어집니다. <br/>
