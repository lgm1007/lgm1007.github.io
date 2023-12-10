---
layout:	post
title: Early Return을 알아보자
date: 2023-12-09 09:40:58 +0900
image: programming-style-1.jpg
author: GyuMyung
tags: programming-style
comments: true
---

# Early Return을 알아보자

### Early Return을 사용하면 좋은 경우

먼저 아래와 같은 계산을 하는 코드가 있다고 생각해보자. <br/>

```java
public class ExampleClass {
    public int calculateResult(int x, int y) {
        int z = 0;
        boolean condition1 = true;
        boolean condition2 = false;
        
        if (condition1) {
            if (x > y) {
                if (condition2) {
                    z = x + y;
                } else {
                    z = x - y;
                }
            } else {
                if (condition2) {
                    z = x * y;
                } else {
                    z = x / y;
                }
            }
        } else {
            z = 0;
        }
        
        return z;
    }
}
```
<br/>

코드를 한 눈에 봤을 때 어떤 조건에서 어떤 값을 반환하는지 바로 알 수 있는가? 아마 대다수가 자연스럽게 읽히지 않는 코드일 것이라고 생각한다. <br/>
위와 같이 중첩된 조건문으로 인해 읽기 어려운 코드를 보다 읽기 쉽게 바꿔주는 **Early Return** 이라는 코드 스타일이 있다. <br/><br/>

아래는 Early Return 을 적용하여 위 코드를 다시 작성한 예시이다. <br/>

```java
public class ExampleClass {
    public int calculateResult(int x, int y) {
        boolean condition1 = true;
        boolean condition2 = false;
        
        if (!condition1) {
            return 0;
        }

        if (x > y) {
            if (condition2) {
                return x + y;
            } else {
                return x - y;
            }
        } else {
            if (condition2) {
                return x * y;
            } else {
                return x / y;
            }
        }
    }
}
```
<br/>

한 눈에 봤을 때 Early Return 을 적용한 코드가 어떤 조건에서 어떤 값이 반환되는지 더 쉽게 알 수 있는 것을 확인할 수 있다. <br/>

대표적인 Early Return 에 대한 설명으로 아래 글귀를 찾을 수 있었다. <br/>

---

_종종 프로그래머에게 "메서드 내의 결과를 반환하는 부분을 오직 한 군데에서만 하도록" 하는 경우가 있는데, 이는 빈곤한 가이드라인이다._ <br/><br/>
_결과를 할당하는 것은 "이게 최종 값이며, 여기에서 메서드는 멈춘다"라는 의도를 설명하지 않으며 "이 결과가 완료된 결과야? 수정할 수 있는거야?"라는 의문을 남기고, 결과를 수정하는 실수를 허용하기도 한다. 그러므로 함수가 더 이상 의미있는 동작을 하지 않는다는 것을 알자마자 반환하고 `if/else` 대신에 `if/return` 구조를 사용하여 들여쓰기를 최소한으로 줄이자._

---

### Early Return의 장점
1. Early Return은 조건문의 Depth를 줄여 코드를 간결하게 만들어준다.
2. 유효하지 않은 경우를 먼저 처리하여 함수의 진짜 본문에 집중할 수 있게 해준다.

### Early Return 사용 시 유의할 점

물론 Early Return 을 사용할 때 유의해야 할 점이 있다. <br/>
우선, 조건문의 범위 및 순서를 잘 고려하지 않고 배치하면 원하는 동작을 하지 못하는 코드가 작성될 수 있다. <br/>
아래 예제는 위 예제 코드에서 조건문의 순서를 변경한 코드이다. <br/>

```java
public class ExampleClass {
    public int calculateResult(int x, int y) {
        boolean condition1 = true;
        boolean condition2 = false;
        
        if (x > y) {
            if (condition2) {
                return x + y;
            } else {
                return x - y;
            }
        } else {
            if (!condition1) {
                return 0;   // condition1이 false 일 때 0을 반환하는 구문 전에 x > y 조건을 만족하면서 원하지 않은 결과가 반환될 수 있다. 
            }
            
            if (condition2) {
                return x * y;
            } else {
                return x / y;
            }
        }
    }
}
```
<br/>

원래 예제 코드에서는 `!condition1`이 `false`일 때 먼저 0을 반환했던 메서드였는데, 위의 코드처럼 조건문의 순서가 바뀌어서 만약 `x > y` 조건을 만족해버리면 0이 아닌 원치 않은 값을 반환하게 될 수도 있어진다. <br/>
따라서 조건문의 범위 및 순서를 잘 고려하여 코드를 작성해야 Early Return을 적용하면서 원하는 결과를 받을 수 있는 로직을 작성할 수 있다. <br/>

### Early Return의 단점

유의할 점을 살펴봤고 다음에는 Early Return 의 단점으로 꼽히는 부분이다. 바로 함수의 반환 포인트가 여러 군데로 흩어지게 되면서 함수의 복잡도를 높인다는 점이다. <br/>
이는 "함수는 오직 하나의 Exit Point를 가져야 한다."라는 코딩 규칙에 위배되는 부분이라 비판하는 사람들도 있다. <br/>
예를 들어, 200줄이 넘는 함수에 여러 반환 포인트들이 무작위인 함수가 있다면 읽기 쉬운 코드라고 할 수 없을 것이다. <br/><br/>

### 정리

하지만, "함수는 오직 하나의 Exit Point를 가져야 한다."라는 코딩 규칙은 다익스트라의 구조화된 프로그래밍에서 제시된 규칙으로, C언어나 어셈블리어와 같이 수동으로 자원 관리를 하는 언어에서 명시되던 규칙이다. <br/>
요즘 많이 사용하는 언어처럼 수동으로 자원을 관리하지 않는 언어에서는 이러한 규칙을 굳이 지킬 필요는 없다고 생각하고, 가독성을 해치지 않는 선에서 Early Return 스타일을 적용한다면 이해하기 쉬운 코드를 작성하는 데 도움이 될 것이라고 생각한다. <br/>

