---
layout:	post
title: Bouncer 패턴과 Extract method 기법
date: 2023-12-10 12:54:17 +0900
image: programming-style-2.jpg
author: GyuMyung
tags: programming
comments: true
---

# Bouncer 패턴과 Extract method 기법

이전 포스팅에서 다룬 Early Return 기법의 단점이었던 "여러 줄의 코드에서 적용했을 때 함수의 복잡도가 높아진다." 라는 점을 보완하기 위한 방법 중 대표적인 방법인 **Bouncer 패턴**과 **Extract method 기법**에 대해 다루어본다. <br/>

### Bouncer 패턴

경비원 패턴으로도 불리는 Bouncer 패턴은 예외 케이스를 먼저 진행해서 if 조건문의 depth를 최대한 줄이는 패턴이다. 예외 케이스를 먼저 처리해서 중첩된 if 문을 사용하지 않고도 간단하게 코드를 작성할 수 있다. <br/>
다음은 Bouncer 패턴을 사용하지 않은 예제 코드이다. <br/>
```java
import java.util.regex.Pattern;

public class DataProcessor {
    public String processWithoutBouncer(String data) {
        // 일반적인 if문을 사용함
        if (data != null && !data.isEmpty()) {
            if (Pattern.matches("^[a-zA-Z]*$", data)) {
                return data.toUpperCase();
            } else {
                System.out.println("데이터가 영문자가 아닙니다.");
                return null;
            }
        } else {
            System.out.println("데이터가 존재하지 않습니다.");
            return null;
        }
    }
}
```
<br/>

위처럼 코드를 작성한 경우에는 if 조건문으로 예외 처리한 부분으로 가독성도 떨어지고 조건문에서 어떤 예외를 처리하고 있는지 한 눈에 확인하기 어렵다. 다음 아래 예제는 위 코드에서 Bouncer 패턴을 사용하여 작성한 코드이다. <br/>

```java
import java.util.regex.Pattern;

public class DataProcessor {
    public String processWithBouncer(String data) {
        try {
            // Bouncer: 데이터가 비어있는지 확인
            if (data == null || data.isEmpty()) {
                throw new IllegalArgumentException("데이터가 존재하지 않습니다.");
            }
            // Bouncer: 데이터가 영문자인지 확인
            if (!Pattern.matches("^[a-zA-Z]*$", data)) {
                throw new NoAlphabetDataException("데이터가 영문자가 아닙니다.");
            }
            
            // 나머지 코드: 비즈니스 로직 작성
            return data.toUpperCase();
        } catch (IllegalArgumentException e) {
            System.out.println("예외 발생: " + e.getMessage());
            return null;
        } catch (NoAlphabetDataException e2) {
            System.out.println("예외 발생: " + e2.getMessage());
            return null;
        }
    }
}
```
<br/>

Bouncer 패턴을 적용한 코드는 비즈니스 로직 이전에 예외 케이스를 체크하기 때문에 한 눈에 어떤 예외 처리를 하는지 확인할 수 있고, if 조건문의 depth 또한 줄일 수 있어 코드도 더 간결해지는 것을 볼 수 있다. <br/>

### Extract Method 기법

Extract Method 기법은 코드의 리팩토링 기법 중 하나로 그룹으로 함께 묶을 수 있는 코드 조각이 있으면 코드의 목적이 잘 드러날 수 있도록 메서드의 이름을 지어 별도의 메서드로 추출하는 기법이다. <br/>
이 기법을 적용하면 중복 코드를 방지하고 재사용성을 높일 수 있고, 메서드에 이름을 지어 코드 조각을 추출하기 때문에 해당 코드 조각이 어떤 역할을 하는 코드인지 알아보기도 쉽다. <br/><br/>

아래는 Extract Method 기법을 적용하지 않은 예제 코드이다. <br/>
```java
public class Calculator {
    public static void main(String[] args) {
        int a = 10;
        int b = 5;
        
        int sum = a + b;
        System.out.println("Sum: " + sum);
        
        int difference = a - b;
        System.out.println("Diff: " + difference);
    }
}
```
<br/>

위 코드에서는 `sum`과 `difference`를 계산하는 부분에서 중복이 발생하고 있다. <br/>
아래는 위 예제 코드에서 Extract Method 기법을 적용한 코드이다. <br/>

```java
public class Calculator {
    public static void main(String[] args) {
        int a = 10;
        int b = 5;
        
        printSum(a, b);
        printDifference(a, b);
    }
}

private void printSum(int a, int b) {
    int sum = a + b;
    System.out.println("Sum: " + sum);
}

private void printDifference(int a, int b) {
    int difference = a - b;
    System.out.println("Diff: " + difference);
}
```
<br/>

위와 같이 Extract Method 기법을 적용하면 코드 중복을 제거할 수 있고, 메인 비즈니스 로직의 가독성을 향상시키는 것 또한 확인할 수 있다. 또한 나중에 이렇게 추출한 메서드를 재사용할 수 있다는 장점도 있다. <br/>
