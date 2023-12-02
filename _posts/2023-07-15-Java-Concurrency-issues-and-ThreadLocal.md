---
layout:	post
title:  Java 동시성 이슈와 ThreadLocal
date:   2023-07-15 11:27:00 +0900
image:  language-3.jpg
author: GyuMyung
tags:   language
comments: true
---
## Java 동시성 이슈와 쓰레드 로컬 (ThreadLocal)

### Java의 동시성 이슈
동시성 이슈 (Concurrency issues)는 다중 쓰레드 환경에서 발생하는 문제로, 여러 쓰레드가 공유된 자원에 동시에 접근할 때 예기치 않은 결과가 발생할 수 있다. 동시성 이슈는 아래 상황에서 발생할 수 있다.

1. 경쟁 조건 (Race Condition)
    * 여러 쓰레드가 **동시에 공유된 자원에 접근**하여 서로의 실행 결과에 영향을 줄 수 있다. 예를 들어, 두 쓰레드가 동시에 같은 변수를 증가시킨다면, 결과적으로 변수의 값이 올바르게 증가하지 않을 수 있다.
2. 교착 상태 (Deadlock)
    * 두 개 이상의 쓰레드가 서로가 소유한 자원을 기다리며 **무한히 대기하는 상태**를 의미한다. 각 쓰레드는 다른 쓰레드가 보유한 자원을 요청하면서 상호간에 락 (Lock)을 획득하고, 두 쓰레드가 서로의 락을 해제하기를 기다리는 상황에서 발생할 수 있다.
3. 쓰레드 안전성 문제 (Thread Safety)
    * 여러 쓰레드가 동시에 객체나 데이터 구조에 접근할 때, 쓰레드 간의 **상태 변경이 원자적으로 이루어지지 않으면** 예상치 못한 결과가 발생할 수 있다.

<br/>

다음은 동시성 이슈가 발생하는 상황을 보여주는 간단한 예제이다. 아래 코드는 여러 쓰레드가 공유 변수를 증가시키는 에제이다. <br/>
```java
public class ConcurrencyExample {
    private static int counter = 0;    // 공유 변수

    public static void main(String[] args) throws InterruptedException {
        Thread t1 = new Thread(() -> {
            for (int i = 0; i < 1000; i++) {
                counter++;
            }
        });

        Thread t2 = new Thread(() -> {
            for (int i = 0; i < 1000; i++) {
                counter++;
            }
        });

        t1.start();
        t2.start();

        t1.join();
        t2.join();

        System.out.println("Counter: " + counter);
    }
}

```
위 예제에서 `counter` 변수를 두 개의 쓰레드가 동시에 증가시키고 있다. <br/>
그러나 이 예제는 동시성 이슈를 가지고 있다. 실행할 때마다 결과가 달라질 수 있으며, 예상한 결과가 나오지 않을 수 있다. <br/>
이는 두 개의 쓰레드가 동시에 `counter` 변수에 접근하여 값의 증가를 처리하기 때문에 발생하는 문제이다. <br/>

이러한 동시성 문제를 해결하기 위해 Spring 프레임워크에서는 다양한 동기화 메커니즘과 도구를 제공한다. <br/>
이번 글에서는 그 중 하나인 쓰레드 로컬에 대해 설명한다. <br/>

### 쓰레드 로컬 (ThreadLocal)
쓰레드 로컬은 각 쓰레드가 독립적으로 값을 유지하도록 도와주는 클래스이다. 각 쓰레드는 자신만의 쓰레드 로컬 변수를 가질 수 있으며, 해당 변수는 다른 쓰레드에게 영향을 주지 않는다. <br/>
즉 쓰레드 로컬은 각 쓰레드 간에 공유되지 않고 독립적으로 저장되는 변수이기 때문에, 쓰레드 간 동시성 이슈를 해결할 수 있다. <br/>

다음은 쓰레드 로컬을 사용하여 위 `counter` 예제의 동시성 이슈를 해결하는 예제이다. <br/>
```java
public class ThreadLocalExample {
    private static ThreadLocal<Integer> counter = ThreadLocal.withInitial(() -> 0);

    public static void main(String[] args) throws InterruptedException {
        Thread t1 = new Thread(() -> {
            for (int i = 0; i < 1000; i++) {
                counter.set(counter.get() + 1);
            }
        });

        Thread t2 = new Thread(() -> {
            for (int i = 0; i < 1000; i++) {
                counter.set(counter.get() + 1);
            }
        });

        t1.start();
        t2.start();

        t1.join();
        t2.join();

        System.out.println("Counter: " + counter.get());
    }
}
```
위 예제에서는 `counter` 변수를 `ThreadLocal<Integer>` 객체로 선언하고, `withInitial()` 메서드를 호출하여 초기값을 설정한다. 각 쓰레드에서 `counter` 값을 읽고 증가시킬 때에는 `get()` 메서드와 `set()` 메서드를 사용한다. <br/>

이렇게 하면 각 쓰레드는 자신만의 독립적인 `counter` 값을 유지하게 된다. 따라서 쓰레드 간의 동시성 문제는 발생하지 않는다. 예제를 실행해보면 예상한 결과인 2000이 항상 나오는 것을 확인할 수 있다. <br/>

쓰레드 로컬은 주로 쓰레드 로컬 컨텍스트에서 데이터를 공유해야 하는 상황에서 유용하다. 예를 들어, 웹 애플리케이션에서 각 요청마다 사용자 세션 정보를 쓰레드 로컬로 저장하여 여러 컴포넌트에서 쉽게 접근할 수 있도록 할 수 있다. <br/>

---

쓰레드 로컬을 사용할 때는 주의해야 할 점도 물론 있다. 쓰레드 로컬은 각 쓰레드마다 독립적인 값을 유지하기 때문에, 메모리 누수 (memory leak)에 주의해야 한다. 사용이 끝난 후에는 `remove()` **메서드를 호출하여 명시적으로 값을 제거**해줘야 한다. 또한, 쓰레드 로컬 변수를 **정적 (static)으로 선언하면 해당 변수가 모든 쓰레드에게 공유**되므로 주의해야 한다.   

---

