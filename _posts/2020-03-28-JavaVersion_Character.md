---
layout:	post
title:  JavaVersion_Character
date:   2020-03-28 14:37:00 +0900
image:  post-1.jpg
author: GyuMyung
tags:   language
comments: true
---

{:toc}

# 자바 버전 별 차이점

### 1. Java 7

#### 	   1.1 Type Inference (타입 추론) 

```java
// 7이전 버전
List<String> list = new ArrayList<String>();

// 7이후 버전
List<String> list2 = new ArrayList<>();
```

####    1.2 Switch ~ Case 문에 문자열 가능

```java
//Java 코드
switch(a) {
    case "java":
        System.out.println("1st case");
        break;
    case "java2":
        System.out.println("2nd case");
        break;
    default:
        break;
}

//컴파일 후 .class 파일
byte byteVar = -1;
switch(a.hashCode()) {
    case 3254818:
        if(a.equals("java"))
            byteVar = 0;
    case 100899408:
        if(a.equals("java2"))
            byteVar = 1;
}

switch(byteVar) {
    case 0:
        System.out.println("1st case");
        break;
    case 1:
        System.out.println("2nd case");
        break;
}
```

- `hashCode`로 바로 `case`문을 적용하면 되지 않을까? 라는 의문을 가질 수도 있지만 `hashCode`는 다른 객체끼리 충돌이 나게되면 중복될 수도 있기에 검사를 두 번 걸쳐 해야 한다고 한다. 

####    1.3 Automatic Resource Management (자동 자원 관리)

- DB 연동, 파일스트림과 같이 `open`하고 `close`를 해야 하는 경우 `try ~ catch`문 다음 `finally`내에 `close`를 해주는데 Java7부터는 알아서 `try` 마지막에 `close`를 하게 된다.

####    1.4 Catching Multiple Exception Type in Single Catch Block

- Java 7 이후부터 멀티 `catch`가 가능해졌다.

####    1.5 이진수 표현

- 숫자 앞에 `0B`나 `0b`를 붙이면 이진수로 판단하는 기능 (8진수는 `0`, 16진수는 `0x`나 `0X`)



### 2. Java 8

####    2.1 Lambda

- Lambda 표현식이라고 불리며, 다양한 표현식들이 있다.
- 컴파일러 (JIT 인터프리터)에게 실질적 구현을 시키는 방식이다.
- 단순 `for-loop`와의 비교를 하면 Lambda 표현식을 사용하면 더 느릴 수도 있지만 절대적인 것은 아니다.

####    2.2 Interface 클래스에 구현체 작성 가능

- `default`와 `static` 키워드를 사용해서 구현 메소드를 `interface`에 작성할 수 있게 되었다.

####    2.3 Optional

- `Optional`은 `null`이 될 수도 있는 객체를 감싸는 일종의 `wrapper` 클래스이다.

- `null`체크를 최대한 하지 않고 코딩하도록 나온 클래스

####    2.4 다양한 DateTime 추가 (LocalDate Time 등)

####    2.5 GC 성능 대폭 개선

- Java 8부터 메모리 누수를 일으키던 메소드 영역의 `PermGen Area`를 제거하여 static 인스턴스와 문자열도 `GC`의 대상이 되도록 바뀌었으며 클래스, 메소드, 배열의 메타 정보는 동적 리사이징이 가능한 `Metaspace`로 이동시켜 시스템 힙 영역에 저장한다. 따라서 `JVM` 힙 영역의 공간이 늘고 `PermGen Area`를 스캔 및 삭제할 필요가 없어져 `GC`의 성능이 대폭 상향되었다.



### 3. Java 9

####    3.1 인터페이스 내 private 구현체 가능

####    3.2 모듈 시스템 등장 (jigsaw)

- 기존 `jar`방식을 개선하기 위함



### 4. Java 10

####       4.1 Local Variable Type Inference -> var 사용

####    4.2 JVM heap 영역을 NVDIMM (비휘발성 NAND 플래시 메모리) 또는 사용자 지정과 같은 대체 메모리 장치 할당 가능





[출처: Jeongmin's Blog](https://ggomi.github.io/jdk-version/)