---
layout: post
title: lombok @Builder의 기본값 초기화 딜레마
date: 2023-11-28 21:03:58 +0900
sitemap: 
image: troubleshooting-2.jpg
author: GyuMyung
tags: troubleshooting
comments: true
---

# lombok @Builder의 기본값 초기화 딜레마
## 개요

lombok에서 제공해주는 `@Builder` 어노테이션은 생성자 인자를 메서드 체인으로 대입하여 생성자를 호출할 수 있게 빌더 클래스를 생성해준다.

클래스 레벨에서 `@Builder`를 선언하면 모든 요소를 받는 package-private 생성자가 자동으로 생성되고, 해당 생성자에 `@Builder`를 선언한 것과 동일하게 동작한다. 이러한 생성자는 `@NoArgsConstructor`, `@RequiredArgsConstructor` 또는 어떤 생성자도 클래스 내부에 선언하지 않았을 경우에만 생성된다.

객체 생성 시 간편하고 명확하게 생성할 수 있도록 도움을 주는 `@Builder` 어노테이션이지만, 사용 시 주의해야 할 점도 있다.

## 주의점

주의해야 할 점은 객체 생성 시 객체 필드의 기본값 초기화가 `new` 연산자와 살짝 다른 부분이 있다는 점이다.

아래는 `@Builder`로 객체를 생성하려고 하는 예제이다.

```java
@Getter
@ToString
@Builder
public static class PosterDto {
    private String title;
    private String writerId;
    private List<Comment> comments = new ArrayList<>();
    
    // 그 외 필드 ...
}
```

그리고 아래는 위 Dto 객체를 생성하여 사용하려는 메서드의 한 부분이다.

```java
public int preparedUpdatePost(final int postNo) {
    // 메서스 로직 ...
    PosterDto posterDto = PosterDto.builder()
        .title(title)
        .writerId(writerId)
        .build();
    
    return PosterService.requestUpdatePost(posterDto);
}
```

위 메서드에서는 Dto 객체 필드의 `List` 타입인 `comments`에 대해서는 값을 명시적으로 넣어주지 않았다.

`new` 연산자로 생성자 메서드를 통해 객체를 생성할 때는 필드에서 초기화 (`new ArrayList<>();`) 를 선언해줬으므로 해당 `comments` 필드는 빈 리스트가 들어갈 것이다. `@Builder`를 통해 객체를 생성할 때도 이처럼 생각하여 당연히 빈 리스트로 초기화되었을 것으로 예측하여 로직을 구현할 수 있다.

하지만 `@Builder`로 위 예제처럼 객체를 생성한 경우 `comments` 필드는 **null로 초기화된다.**

실제로 빈 리스트로 초기화될 줄 알고 해당 필드에서 리스트 메서드를 호출하는 코드를 작성했다가 `NullPointerException` 예외를 보는 사례를 꽤 볼 수 있다.

왜 이렇게 초기화가 될까 알아보기 위해서는 `@Builder`에서 만들어주는 빌더 클래스를 살펴볼 필요가 있다.

```java
class Example<T> {
    private T foo;
    private final String bar;
    
    private Example(T foo, String bar) {
        this.foo = foo;
        this.bar = bar;
    }
    
    public static <T> ExampleBuilder<T> builder() {
        return new ExampleBuilder<T>();
    }
    
    public static class ExampleBuilder<T> {
        private T foo;
        private String bar;
        
        private ExampleBuilder() {}
        
        public ExampleBuilder foo (T foo) {
            this.foo = foo;
            return this;
        }
        
        public ExampleBuilder bar (String bar) {
            this.bar = bar;
            return this;
        }
        
        public Example build() {
            return new Example(foo, bar);
        }
    }
}
```

위 코드를 살펴보면 빌더 클래스는 원본 클래스의 내부 클래스로 생성되어 있는데, 원본 클래스의 각 필드에 대한 `setter` 메서드로 구성되어 있고 `build()` 메서드를 호출하게 되면 원본 클래스의 인스턴스를 반환한다.

내부 클래스에서는 원본 클래스의 필드를 초기화하는 부분이 없으며, 따라서 빌더 클래스를 통해 생성된 객체에서 명시하지 않은 필드는 null로 초기화될 것이다.

## 해결 방안
lombok에서는 이러한 이슈를 해결하기 위해 `@Builder.Default` 라는 어노테이션을 제공한다.

해당 어노테이션은 기본값으로 초기화할 필드에 선언하며, 해당 어노테이션이 선언된 필드는 빌더로 생성할 때에도 정의해 준 기본값으로 초기화된다.

```java
@Getter
@ToString
@Builder
public static class PosterDto {
    private String title;
    private String writerId;
    @Builder.Default
    private List<Comment> comments = new ArrayList<>();
    
    // 그 외 필드 ...
}
```

위와 같이 `@Builder.Default`로 선언 후 `new ArrayList<>()`로 기본값을 설정해주면 해당 Dto 객체를 빌더를 통해 생성해줄 때 `comments` 필드에 대하여 명시적으로 선언해주지 않아도 `comments` 필드는 빈 리스트로 초기화된다.
