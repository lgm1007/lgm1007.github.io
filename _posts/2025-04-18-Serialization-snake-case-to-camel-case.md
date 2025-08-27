---
layout:	post
title: 직렬화 케이스 SnakeCase 👉 CamelCase 변환 이슈
date: 2025-04-18 16:00:05 +0900
sitemap: 
image: program-03.jpg
author: GyuMyung
tags: programming
comments: true
---

### 일반적인 직렬화 케이스 변환 이슈 (CamelCase 👉 SnakeCase)
일반적으로 Java 또는 Kotlin 언어로 Spring 기반의 백엔드 작업을 하면, 객체의 필드를 카멜 케이스 (CamelCase)로 정의하는 것이 일반적이다. 그리고 만약 클라이언트 측에서 서버 측으로부터 전달받는 데이터를 스네이크 케이스 (SnakeCase)로 전달받고 싶어하는 경우가 일반적인 직렬화 이슈일 듯 하다.

이런 경우에는 `jackson` 라이브러리에서 제공해주고 있는 `PropertyNamingStrategies.SnakeCaseStrategy.class` 를 `@JsonNaming` 어노테이션과 활용하면 간단하게 해결 가능하다.

```java
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class userDto {
    private final String firstName;
    private final String lastName;
}
```

해당 객체를 실제로 직렬화하게 되면 다음과 같이 변환된다.

```json
{
    "first_name": "GM",
    "last_name": "Lee"
}
```

### 특수한 직렬화 케이스 변환 이슈 (SnakeCase 👉 CamelCase)
그러면 만약 반대되는 케이스라면, 즉 Java 객체의 필드는 스네이크 케이스이고, 클라이언트 측에서 전달받고 싶어하는 데이터 형식이 카멜 케이스인 경우는 어떻게 처리할까?

```java
public class userDto {
    private final String first_name;
    private final String last_name;
}
```

이런 경우는 특수하지만, 만약 JPA와 같은 ORM을 사용하고 있지 않은 프로젝트이고, DB의 컬럼명이 스네이크 케이스로 정의되어 있는 경우에는 충분히 발생 가능한 경우이다.
(그걸 내가 겪어버렸다... 이걸 빌미로 블로그를 쓸 수 있으니 럭키비키다 🍀)

물론 `jackson` 라이브러리에서 `PropertyNamingStrategies.LowerCamelCaseStrategy.class` 를 제공해주고 있긴 하지만 실제로 이를 적용해서 테스트해보면 적용되지 않는다.

```java
// 실제로 클라이언트 측에서 전달받을때는 스네이크 케이스 그대로 전달받음
@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class userDto {
    private final String first_name;
    private final String last_name;
}
```

왜냐하면 `jackson` 라이브러리에서의 PropertyNamingStrategy 기능은 객체의 필드가 **자바 컨벤션대로 작성되어 있을 때만 제대로 작동하기 때문**이다. 자바 컨벤션을 따르는 경우, 즉 카멜 케이스로 작성되어 있는 경우에만 작동한다는 의미이다. (그럼 `LowerCamelCaseStrategy`를 사용하는 경우는 없지 않나...? 🤔 왜 만든걸까 추후 조사해봐야겠다.)

그러면 스네이크 케이스로 작성된 필드를 어떻게 카멜 케이스로 전달해줘야 할까? 가장 보편적인 방법은 `@JsonProperty` 어노테이션으로 필드 별로 일일이 직렬화할 때 전달해 줄 필드명을 정의해주는 방법이다.

```java
public class userDto {
    @JsonProperty("firstName")
    private final String first_name;

    @JsonProperty("lastName")
    private final String last_name;
}
```

그렇지만 이 방법은 필드 별로 일일이 정의해줘야 한다는 단점이 있어 필드가 다수 개인 객체가 존재하는 경우엔 상당히 번거롭다는 문제가 있다. 그리고 이런 심플한 방법만 소개한다면 굳이 해당 주제로 블로그를 작성하지도 않았을 터!

두 번째 방법은 커스텀한 CaseStrategy를 생성하는 방법이다. `jackson` 라이브러리에서 제공해주는 각 Strategy 클래스처럼 `PropertyNamingStrategies.NamingBase` 를 상속받고, `translate()` 메서드를 재정의한 클래스를 생성해줄 것이다.

`translate()` 메서드를 재정의할 때는 스네이크 케이스와 같은 문자를 카멜 케이스 형태로 변경해주는 기능을 정의해주면 된다. 기능을 풀어서 생각해보면 `_` (언더바) 문자가 나올 때는 언더바 문자 제거 후 뒤에 나오는 문자를 대문자로 변환해주고, 나머지 문자는 그대로 붙여주면 카멜 케이스처럼 변환될 것이다.

레츠 두 디스

```java
public class SnakeToCamelNamingStrategy extends PropertyNamingStrategies.NamingBase {
    public SnakeToCamelNamingStrategy() {}

    @Override
    public String translate(String input) {  
        if (input == null || input.isEmpty()) {  
           return input;  
        }  
      
        StringBuilder ret = new StringBuilder();
        boolean upperCase = false;  
      
        // Snake_case -> CamelCase 변환  
        for (char c : input.toCharArray()) {
           if (c == '_') {
              upperCase = true; // underscore 뒤에는 대문자
              continue;
           }
           
           ret.append(upperCase ? 
                 Character.toUpperCase(c) : c);
           upperCase = false; // 대문자 처리 후에는 다시 소문자 처리  
        }
        return ret.toString();  
    }
}
```

언더바 문자가 나올 때는 다음 문자가 대문자인지 체크하는 `upperCase` 플래그를 `true`로 설정, 언더바 문자가 아닌 경우 `upperCase` 플래그 값에 따라 대문자로 변환 또는 문자 그대로 입력받도록 정의했다. 아주 chill하다 😎

이제 만들어 준 해당 클래스를 `@JsonNaming` 어노테이션에 적용해주면, 원하는 대로 직렬화가 되는 모습을 확인할 수 있다.

```java
@JsonNaming(SnakeToCamelNamingStrategy.class)
public class userDto {
    private final String first_name;
    private final String last_name;
}
```

```json
{
    "firstName": "GM",
    "lastName": "Lee"
}
```

