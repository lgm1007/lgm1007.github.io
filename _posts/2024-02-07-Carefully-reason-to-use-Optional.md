---
layout:	post
title: Optional을 조심히 사용해야 하는 이유
date: 2024-02-07 21:13:01 +0900
sitemap: 
image: language-7.jpg
author: GyuMyung
tags: language
comments: true
---

# Optional을 조심히 사용해야 하는 이유
어느 날, 같은 팀원분이 내가 Optional을 사용해서 작성한 코드를 보고 Optional을 사용할 때는 조심해서 사용해야 한다고 일러준 적이 있었다. 
그 때 팀원분은 Optional의 개발자가 Optional은 반환 타입으로만 사용하도록 의도했다고 이야기해 주었고, 이번 게시글은 Optional을 사용하면서 어떤 점을 주의해야 하는지와 옳게 사용하는 방법에 대해 찾아보고 정리하는 글이다.
<br/>
<br/>

### Optional이 위험할 수 있는 이유
#### 1. NullPointerException 대신 NoSuchElementException이 발생할 수 있다.
```java
Optional<String> optionalStr = Optional.ofNullable(null);
String getStr = optionalStr.get();   // NoSuchElementException 발생!
```
* Optional로 받은 변수의 값의 존재 여부를 모르고 `get()`과 같은 메서드를 호출하게 되면 NoSuchElementException이 발생할 수 있다.

#### 2. 이전에 없던 새로운 문제가 발생할 수 있다.
* Optional 클래스 타입을 필드 멤버로 갖게 되면 직렬화(Serialize)할 수 없다.
  * Optional 클래스는 직렬화를 지원하지 않기 때문이다.

```java
class Member implements Serializable {
    private Optional<String> name;
    
    // ...
}
```

#### 3. 코드의 가독성이 떨어진다.
* Optional에서 값에 접근하기 위해 `get()` 메서드를 호출하는데, 위에서 본 것처럼 빈 Optional로 받은 변수의 값 존재 여부를 모르고 호출하면 NoSuchElementException이 발생할 수 있기 때문에 Optional 객체가 값을 가지고 있는지 체크해야 한다.
* 또한, Optional 인스턴스 자체가 `null`일 수도 있기 때문에 해당 부분도 체크하게 되면 코드의 가독성은 현저히 떨어지게 된다.

#### 4. 시간적, 공간적 비용 증가
* **시간적 비용**
  * Optional 안에 있는 객체를 얻기 위해서는 Optional 객체를 통해 접근해야 하므로 접근 비용 증가
* **공간적 비용**
  * Optional은 객체를 감싸는 래퍼 클래스로, Optional 객체 자체를 저장하기 위한 메모리가 추가로 필요

<br/>

### 올바른 Optional 사용을 위한 가이드
#### 1. Optional 변수에 null을 할당하지 마라
* Optional 변수에 `null`을 할당하게 되면 Optional 인스턴스 자체가 `null`인지 검사해야 하는 문제가 발생한다.
* 또한 반환 값으로 `null`을 사용하지 않기 위해 등장한 것이 Optional인데, 이는 Optional 사용 의도와 맞지 않는 방법이다.
* 따라서 값이 없는 경우라면 Optional의 `empty()` 메서드로 빈 Optional 인스턴스를 초기화해준다.

```java
// 피해야 할 예제
Optional<Member> findById(Long id) {
    // ...

    if (contition == 0) {
        return null;
    }
}

// 올바른 사용 예제
Optional<Member> findById(Long id) {
    // ...
    
    if (contition == 0) {
        return Optional.empty();
    }
}
```

#### 2. `orElseGet()`으로 기본 값을 반환하라
* Optional의 `orElseGet()` 메서드를 사용하면 매개변수에 함수형 인터페이스를 전달하여 Optional 내 변수 값이 null인 경우에 매개변수에 전달된 함수형 인터페이스를 실행시켜 대체값을 반환할 수 있다.
* `isPresent()`와 `get()` 메서드를 사용하여 값을 가져오는 것보다 `orElseGet()` 메서드를 사용하는 것을 권장한다.

```java
// 피해야 할 예제
Optional<String> optionalStr = Optional.ofNullable(null);
String getStr;

if (optionalStr.isPresent()) {
    getStr = optionalStr.get();
} else {
    getStr = findDefaultText();
}

// 올바른 사용 예제
Optional<String> optionalStr = Optional.ofNullable(null);
String getStr = optionalStr.orElseGet(() -> findDefaultText());
```

#### 3. 단순히 값을 얻으려는 목적으로만 Optional을 사용하지 마라
* Optional 클래스를 사용하는 것은 위에서 언급한 것처럼 시간적, 공간적 비용이 증가한다.
* 값을 얻으려할 때 굳이 이러한 비용을 낭비하는 것보단 단순 조건문으로 직접 반환하는 것이 적절한 방법이다.

```java
// 피해야 할 예제
private String findMemberName(Long id) {
    // name은 저장소로부터 가져온 값이라고 가정
    return Optional.ofNullable(name).orElse("unnamed");
}

// 올바른 사용 예제
private String findMemberName(Long id){
    // name은 저장소로부터 가져온 값이라고 가정
    return name == null ? "unnamed" : name;
}
```

#### 4. 생성자, Setter, 파라미터 등으로 Optional을 넘기지 마라
* 넘겨온 매개변수를 위해 Optional 인스턴스 자체를 `null` 체크해야 하는 등 코드가 복잡해질 수 있다.
* 또한 생성자나 Setter에 Optional 타입으로 받았다는 의미는 필드 또한 Optional 타입이라는 의미가 되는데, 이 경우 직렬화를 하지 못하는 문제를 야기할 수 있다.

```java
// 피해야 할 예제
public class Member {
    private Optional<String> name;
    
    public Member(Optional<String> name) {
        this.name = name;
    }
}
```

#### 5. Optional을 빈 컬렉션이나 배열을 반환하는 데 사용하지 마라
* 컬렉션이나 배열로 복수의 결과를 반환하는 데 '결과 없음'을 명확하게 나타내는 데 바람직한 방법은 빈 컬렉션 또는 배열을 반환하는 방법이다.

```java
// 피해야 할 예제
public Optional<List<Member>> getMemberList() {
    List<Member> memberList = // ...;
    return Optional.ofNullable(memberList);
}

// 올바른 사용 예제
public List<Member> getMemberList() {
    List<Member> memberList = // ...;
    return memberList == null ? Collections.emptyList() : memberList;
}
```

#### 6. Optional은 반환 타입으로만 사용하라
* Optional은 반환 타입으로써 '결과 없음'을 드러내기 위해 개발되었다.
* 언어를 만드는 사람의 입장에서 `null`을 반환하는 것보다 값의 유무를 나타내는 객체를 반환하는 것이 합리적일 것이다. 그러한 고민 끝에 Optional이 개발된 것이다.
* 따라서 Optional은 반환 타입으로 대체 동작을 하기 위해 사용하는 것이 적절한 사용방법이다.

