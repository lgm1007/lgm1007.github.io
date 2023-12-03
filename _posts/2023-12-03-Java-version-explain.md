---
layout:	post
title:  자바 버전 별 특징
date:   2023-12-03 19:32:39 +0900
image:  language-1.jpg
author: GyuMyung
tags:   language
comments: true
---

# 자바 버전 별 차이점

### Java 7
1. **Type Inference (타입 추론)** 

```java
// 7이전 버전
List<String> list = new ArrayList<String>();

// 7이후 버전
List<String> list2 = new ArrayList<>();
```

2. **Switch ~ Case 문에 문자열 가능**

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

* `hashCode`로 바로 `case`문을 적용하면 되지 않을까? 라는 의문을 가질 수도 있지만 `hashCode`는 다른 객체끼리 충돌이 나게되면 중복될 수도 있기에 검사를 두 번 걸쳐 해야 한다고 한다. 

<br/>

3. **Automatic Resource Management (자동 자원 관리)**
   * DB 연동, 파일스트림과 같이 `open`하고 `close`를 해야 하는 경우 `try ~ catch`문 다음 `finally`내에 `close`를 해주는데 Java7부터는 알아서 `try` 마지막에 `close`를 하게 된다.

4. **Catching Multiple Exception Type in Single Catch Block**
   * Java 7 이후부터 멀티 `catch`가 가능해졌다.

5. **이진수 표현**
   * 숫자 앞에 `0B`나 `0b`를 붙이면 이진수로 판단하는 기능 (8진수는 `0`, 16진수는 `0x`나 `0X`)



### Java 8

1. **Lambda**
   * Lambda 표현식이라고 불리며, 다양한 표현식들이 있다.
   * 컴파일러 (JIT 인터프리터)에게 실질적 구현을 시키는 방식이다.
   * 단순 `for-loop`와의 비교를 하면 Lambda 표현식을 사용하면 더 느릴 수도 있지만 절대적인 것은 아니다.
2. **Stream**
   * 반복문을 처리하는 방법 중 하나이다.
   * 병렬 처리가 가능하다. 따라서 스레드 풀에 스레드가 남은 경우 해당 스레드를 이용하여 병렬 처리하기 때문에 속도가 빨라질 수 있다.
```java
list.stream()
        .filter(item -> item.startWith("f"))
        .map(String::toUpperCase)
        .sorted()
        .forEach(System.out::println);
```
3. **Optional**
   * `Optional`은 `null`이 될 수도 있는 객체를 감싸는 일종의 `wrapper` 클래스이다.
   * `null`체크를 최대한 하지 않고 코딩하도록 나온 클래스
   * `null`로 인한 `NullPointerException` 오류를 줄일 수 있다.
4. **Interface default method**
    * `default`와 `static` 키워드를 사용해서 구현 메소드를 `interface`에 작성할 수 있게 되었다.
5. **다양한 DateTime 추가 (LocalDate Time 등)**
6. **GC 성능 대폭 개선**
   * Java 8부터 메모리 누수를 일으키던 메소드 영역의 `PermGen Area`를 제거하여 static 인스턴스와 문자열도 `GC`의 대상이 되도록 바뀌었으며 클래스, 메소드, 배열의 메타 정보는 동적 리사이징이 가능한 `Metaspace`로 이동시켜 시스템 힙 영역에 저장한다. 따라서 `JVM` 힙 영역의 공간이 늘고 `PermGen Area`를 스캔 및 삭제할 필요가 없어져 `GC`의 성능이 대폭 상향되었다.


### Java 9
1. **모듈 시스템 등장** (jigsaw)
2. **불변 컬렉션 생성**
   * `of()` 메서드를 지원하여 불변 컬렉션을 편리하게 생성 가능하다.
```java
// Java 9 이전
void createNumbers() {
    List<Integer> numbers = new ArrayList<>();
    numbers.add(1);
    numbers.add(2);
    numbers.add(3);
    numbers = Collections.unmodifiableList(numbers);
}

// Java 9 이후
void createNumbers() {
    List<Integer> numbers = List.of(1, 2, 3);
}
```
3. **Optional API 추가**
   * `or()` : 값이 없을 경우 Optional 객체를 반환
   * ```java
     final Member member = findMemberByName(name)
         .or(() -> findMemberById(memberId))
         .orElseThrow(() -> throw new Exception("not found member."));
     ```
   * `ifPresentOrElse()` : 비어있을 경우 처리할 내용 추가
   * ```java
     findMemberByName(name).ifPresentOrElse(
         member -> System.out.println("해당 멤버의 세부정보: " + member.metadata);
         () -> log.error("not found member.");
     );
      ```
    * `stream()` : Optional 객체를 Stream 객체로 변환
4. **private Interface method**
   * 인터페이스에서 private 메서드를 사용하여 메서드를 분리할 수 있게 되었고, 중복되는 코드를 재사용할 수 있게 되었다.
   * private static 또한 사용 가능하다.
```java
public interface MyInterface {
	private static void privateInterfaceMethod() {
		System.out.println("This is private method in Interface");
    }
}
```


### Java 10
1. **Local Variable Type Inference (로컬 변수 타입 추론) -> var 사용**
   * `var`는 예약어가 아니기 때문에 변수나 메서드 명으로 사용할 수 있다.
   * `var`는 인스턴스 변수로 사용이 불가능하고, 반드시 초기화를 해야 한다.
   * 자바는 불변 변수에 대한 키워드 제공을 위해 `final var`를 제공한다.
   * `var` 형식의 지역 변수에 익명 클래스를 할당하면 부모가 아닌 익명 클래스 형식을 유추한다.
     * 즉, 익명 클래스에 선언된 필드를 참조할 수 있다.
     * 지역 변수 타입 추론만을 허용하기 때문에 메서드 내부의 변수에만 적용이 가능하다.

```java
var hello = "hello, World!";
var number = 10;
var members = new ArrayList<Member>();
for (var member : members) {
    
}
```

2. **Optional.orElseThrow() 개선**
   * 자바 10 버전 이전에는 `Optional.orElseThrow()` 안에 반드시 예외를 명시해야 했다.
   * 자바 10 버전 이후로는 인자 없이 사용 가능하다.
   * 인자 없이 사용하여 객체가 비어 있을 경우, `NoSuchElementException()` 예외를 발생하게 된다.

```java
// Java 10 버전 이전
String name = findMember()
        .map(Member::getName)
        .orElseThrow( );    // 인자 없이 사용 불가능
```
```java
// Java 10 버전 이후 인자 없이 사용 가능
// 인자 없이 사용 시 NoSuchElementException 예외 발생
public T orElseThrow() {
    if (value == null) {
        throw new NoSuchElementException("No value present");
    }
}
```

3. **Collections API 추가**
   * `copyOf()`: 컬렉션 복사
   * ```java
     public toCopyNumbers(Set<Integer> numbers) {
         this.numbers = Set.copyOf(numbers);
     }
     ```
   * `toUnmodifiable()`: 수정 불가능한 컬렉션 반환
   * ```java
     public List<Integer> toUnmodifiableNumbers(List<Integer> numbers) {
         return numbers.stream()
             .map(number -> number + 1)
             .collect(Collections.toUnmodifiableList())
     }
     ```

### Java 11
1. **약간의 릴리즈**
   * Oracle JDK와 OpenJDK 통합
   * Oracle JDK 구독형 유료 모델 전환
   * 서드파티 JDK 이전 필요
   * Lambda 지역변수 사용법 변경
2. **String 클래스에 새로운 메서드 추가**
   * `Assertions.assertFalse(example.isBlank())`
     * 문자열이 의미있는 내용으로 채워져있는지 검사
   * `System.out.println(example.lines())`
     * 여러 줄로 입력된 문자열을 구분자로 분리한 Stream을 반환하는 메서드
   * `example.strip()`
     * 기존의 `trim()` 메서드 세분화, `trim()`은 시작과 끝에서의 공백을 모두 제거했다면 이 기능은 `strip()`이 물려 받고 앞에서(`stripLeading`) 뒤에서(`stripTrailing`) 공백을 제거할 수 있게 되었다. 
   * `String repeated = example.repeat(3);`
     * 문자열을 주어진 개수만큼 반복해서 새로운 문자열을 만들어준다.
3. **Run Source Files**
   * 빌드 없이 실행 가능
4. **Lambda 매개변수에 대한 지역 변수 유형 추론(var)**
   * Lambda 표현식에 `var` 사용 가능
```java
(var firstName, var lastName) -> firstName + lastName
```

### Java 12
1. **String 클래스에 메서드 강화**
   * `indent()`
     * String 출력 시 들여쓰기를 위한 메서드. 초기 위치를 0 이라고 했을 때 양수는 우측으로, 음수는 좌측으로 이동하는데 처음 위치보다 왼쪽으로 갈 수는 없다.
     * ```java
       String text = "Hello Java\nJDK 12 version!";
       text = text.indent(4);
       ```
   * `transform()`
     * 문자열을 Function 타입의 식에 집어넣어 새로운 형태로 변환할 때 사용
     * ```java
       String text = "Hello";
       StringBuilder transformed = text.transform(value -> 
           new StringBuilder(value).reverse()
       );
       ```
2. **Compact Number Formatting**
   * 숫자들에 대한 formatting을 간단히 출력하기 위한 CompactNumberFormat 추가 (2,000 -> 2천)
   * `NumberFormat.Style.SHORT`, `NumberFormat.Style.LONG`에 따라 출력 형태가 다르다.
     * US locale에서는 첫 단위에서 각각 K와 thousand, 백만 단위에서는 M과 million, 억 단위에는 B와 billion이 사용된다.
   * 한글에서는 `SHORT`와 `LONG` 구별 없이 천, 만, 억이다.
```java
long num = 123456789;
Locale locale = Locale.KOREAN;
NumberFormat likesShort = NumberFormat.getCompactNumberInstance(locale, NumberFormat.Style.SHORT);
likesShort.setMaximumFractionDigits(2);
Assertions.assertEquals("123.46M", likesShort.format(num));

NumberFormat likesLong = NumberFormat.getCompactNumberInstance(locale, NumberFormat.Style.LONG);
likesLong.setMaximumFractionDigits(2);
Assertions.assertEquals("123.46 million", likesLong.format(num));
```
3. **Teeing Collector 추가**
   * 두 개의 Collector들을 Wrapping 하고 그 결과를 병렬로 수집하는데 사용되는 Collector
```java
Stream<Integer> intStream = Stream.of(1, 2, 3, 4, 5, 6, 7);
double avg = intStream.collect(
        Collectors.teeing(Collections.counting(),           // Collector 1
                          Collections.summingInt(i -> i),  // Collector 2
                          (cnt, sum) -> sum*1.0 / cnt));   // 병합
```

### Java 14
1. **스위치 문법 확장**
   * 아래 스위치로 작성한 코드는 기존 스위치 문법으로 작성한 예시이다.
   * ```java
     Month month = Month.JAN;
     int days = -1;
     switch (month) {
         case FEB:
             days = 28;
             break;
         case APR:
         case JUN:
         case SEP:
         case NOV:
             days = 30;
             break;
         default:
             days = 31;
     }
     ```
   * 다음 아래는 달라진 스위치 문법으로 작성한 예시이다.
   * ```java
     Months month = Months.FEB;
     int days = -1;
     switch(month) {
         case FEB days = 28;
         case APR, JUN, SEP, NOV -> days = 30;
         default -> days = 31;
     }
     ```
     * 실행할 라인이 1줄인 경우 Lambda 표현식을 이용하여 break 처리 가능
     * 동일하게 처리되는 여러 조건을 쉼표로 구분하여 한 라인에 작성
2. **Helpful NullPointerExceptions**
   * 기존에는 `NullPointerException`이 발생하면 특정 라인에서 발생했다는 정보 외에 어떤 객체에서 발생했는지 표현되지 않았다.
   * 이제는 상세한 정보가 제공되므로 어디에서 오류가 발생했는지 쉽게 알 수 있다.
```
java.lang.NullPointerException: Cannot invoke "String.length()" because str is null
```

### Java 15
* **Text Block**
  * 멀티라인 문자열을 만들 수 있게 되었다.
  * `"""` 으로 문자열을 둘러쌓아 표현
```java
String str = """
select *
from member
where member_id = 1
""";
```

### Java 16
1. **record 클래스**
   * 불변성의 데이터를 갖는 객체를 만들기 위해 사용된다.
   * 이전 버전에는 이러한 목적을 위해 `final` 키워드를 사용했다. `blank final`을 초기화하기 위해 생성자에서 초기화가 필요했고 `getter`가 필수적이다.
   * ```java
     public class Member {
         private final String name;
         private final int age;
     
         public Member(String name, int age) {
             this.name = name;
             this.age = age;
         }
         public String getName() {
             return name;
         }
         public int getAge() {
             return age;
         }
     }
     ```
   * `record`를 적용하면 간단히 처리할 수 있다. `record`는 `toString`, `hashCode`, `equals` 메서드까지 내부적으로 오버라이드 완료된 상태이다.
   * ```java
     public record Member(String name, int age) {   }
     
     @Test
     public void recordTest() {
        Member member1 = new Member("john", 30);
        Member member2 = new Member("john", 30);
        Assertions.assertEquals(member1, member2);
     }
     ```
2. **Stream에 toList() 메서드 추가**
   * Stream의 동작 결과를 List로 반환해주기 위해 기존에는 `Collectors.toList`를 사용했지만 Stream에 직접 `toList()` 메서드가 추가되었다.
   * ```java
     String[] strNumbers = {"1", "2", "3"};
     List<Integer> arrayToList = Arrays.stream(strNumbers)
                                    .map(Integer::parseInt).toList();
     ```
3. **pattern matching for instanceof**
   * `instanceof` 사용 시 기존에는 타입이 확정되면 명시적으로 형 변환 후 사용했지만 형 변환이 완료된 변수를 바로 선언하여 사용할 수 있게 되었다.
   * ```java
     Object obj = "Hello, Java!";

     // instanceof 결과가 true 이면 바로 형 변환 후 변수에 할당
     if (obj instanceof String str) {
         System.out.println(str.length());
     }
     ```

### Java 17
1. **의사난수 생성기를 통한 난수 생성 API**
   * 기존 `java.util.Random` 클래스를 확장 및 리팩토링한 `RandomGenerator` 난수 생성 API 추가
   * ```java
     RandomGeneratorFactory.all()
          .map(factory -> String.format("%s: %s", factory.group(), factory.name()))
          .sorted()
          .forEach(System.out::println);
     ```
2. **Sealed Classes**
   * 확장(extends)하거나 구현(implements)할 수 있는 클래스 또는 인터페이스를 제한한다.
   * 이전에는 `final` 키워드로 상속을 제한했다.
     * ```java
       class Member {
       }
       
       // SilverMember 클래스는 확장/상속할 수 없다.
       final class SilverMember extends Member {
       }
       ```
   * 17 버전에는 특정 서브 클래스에만 확장을 허용하고 다른 클래스에는 봉인(sealed)하는 방법을 제안한다.
     * ```java
       // Member 클래스는 허용된(permits) 서브 클래스만 확장할 수 있다.
       sealed class Member {
           permits SilverMember;
       }
       
       // SilverMember 클래스는 봉인이 해제되었다.
       non-sealed class SilverMember extends Member {
	        // ...
       }
       
       // 봉인이 해제된 클래스는 다른 서브 클래스에서 확장할 수 있다.
       sealed class BronzeMember extends SilverMember {
           permits IronMember, CommonMember;
       }
       ```
   * Sealed Classes 에는 아래와 같은 규칙이 있다.
     1. sealed 클래스와 permits된 서브 클래스는 동일한 모듈 또는 패키지에 속해야 한다.
     2. 모든 permits된 서브 클래스는 sealed 클래스를 확장해야 한다. (그렇지 않으면 컴파일 오류)
     3. 모든 permits된 서브 클래스는 슈퍼 클래스에 의해 시작된 봉인을 계속할지 말지 선언해야 한다.
        * 더 이상 확장하지 않도록 `final`을 적용할 수 있다.
        * `non-sealed`로 선언하여 다른 클래스가 확장하도록 할 수 있다.
        * 자기 자신도 봉인 클래스로 선언될 수 있다.
3. **AOT & JIT 컴파일러 제거**
   * AOT(Ahead-Of-Time), JIT(Just-In-Time) 컴파일러가 제거되었다.

