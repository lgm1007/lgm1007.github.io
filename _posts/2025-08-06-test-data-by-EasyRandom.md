---
layout:	post
title: 테스트 데이터, EasyRandom 을 사용한다면
date: 2025-08-06 09:21:50 +0900
sitemap: 
image: technology-18.jpg
author: GyuMyung
tags: technology
comments: true
---

# easyRandom으로 테스트용 데이터를 편하게 만들어보자
### 테스트 코드를 작성할 때 불편한 점들
테스트 코드를 작성할 때 흔히 겪는 불편함은 어떤 것들이 있을까?<br/><br/>
나는 테스트용 데이터가 담긴 인스턴스를 만드는 게 번거로울 때가 있었다. 정말 의미 있는 데이터를 담아 테스트용 데이터를 만드는 게 아니라면 임의의 데이터를 테스트 데이터에 담아줘야 하는데, 일일이 그런 작업을 하는 건 테스트 코드를 작성하는 데 있어 걸림돌이었다.<br/>
만약 테스트에서 필요한 객체의 필드가 굉장히 많다면... 어떻게 해야 할까?

```kotlin
data class TooManyFieldClass(
    val col1: String,
    val col2: String,
    val col3: String,
    // ...
    val col100: String,
)
```

물론 Java 라면 Builder 패턴을 활용해서 실제로 테스트에 쓰이는 필드값만 작성해주고, 나머지 필드는 null로 초기화해도 무방할 것이다.<br/>
하지만 Kotlin은 기본적으로 Not-null한 타입이기 때문에 다른 필드들을 편하게 null로 초기화할 수 없다.

### 불편함을 해결하는 방법
바로 이럴 때 테스트용 인스턴스를 생성하는 라이브러리인 **easyRandom**, **FixtureMonkey** 등을 활용해볼 수 있다.<br/>
여기서는 **easyRandom** 라이브러리를 활용하여 테스트용 데이터를 세팅해보겠다.

```gradle
implementation("org.jeasy:easy-random-core:5.0.0")
```

easyRandom 라이브러리를 사용하면 객체의 모든 필드값을 자동으로 무작위로 초기화할 수 있고, 아니면 Kotlin 컴파일러가 data class 에서 제공하는 `copy()` 함수를 통해 특정 필드명만 지정한 필드명으로, 나머지 필드는 무작위 값으로 초기화할 수 있다.

```kotlin
@Test
fun easyRandom으로_필드_초기화() {
    val easyRandom = EasyRandom()
    val sut = easyRandom.nextObject(TooManyFieldClass::class.java)
        .copy(col1 = "테스트할 필드값")

    assertEquals(sut.col1, "테스트할 필드값")
}
```

이는 List와 같은 컬렉션 타입의 필드도 무작위 값이 채워진 컬렉션 값으로 초기화된다.<br/>
만약 컬렉션의 크기를 원하는 크기로 설정하고 싶다면 `EasyRandomParameters`를 사용하면 된다.
```kotlin
data class CollectionFieldClass(
    val items: List<String>
)
```

```kotlin
@Test
fun easyRandom_컬렉션_크기_설정() {
    // 컬렉션 크기를 5로 설정
    val parameters = EasyRandomParameters()
        .collectionSizeRange(5, 5) // 최소, 최대 사이즈
    val easyRandom = EasyRandom(parameters)

    val sut = easyRandom.nextObject(CollectionFieldClass::class.java)

    assertEquals(sut.items.size, 5)
}
```