---
layout:	post
title: JPA 복합 키 사용하기
date: 2024-04-14 00:00:01 +0900
image: language-8.jpg
author: GyuMyung
tags: language
comments: true
---

# JPA 복합 키 사용하기
### 서론
실무에서 새로운 프로젝트를 진행하면서 새로운 DB 테이블을 생성해야 하는 경우가 있었는데, 해당 테이블을 복합 키로 설계해 만들게 되었다. 그러면서 사용하고 있는 ORM인 JPA에서 복합 키를 표현하고 사용해야 하는 상황이 발생하게 되었다. <br/><br/>
이번 포스팅에서는 JPA에서 복합 키를 사용하는 대표적인 2가지를 알아보고, 실제로 나는 어떤 방법을 선택했으며, 왜 이런 선택을 했는지를 다룰 예정이다. <br/>

### JPA에서 복합 키를 사용하는 방법
#### 1. @Embeddable 사용
첫 번째 방법은 `@Embeddable`, `@EmbeddedId` 어노테이션을 이용하는 방법이다. <br/>
간단히 설명하자면 `@Embeddable` 어노테이션을 이용한 식별자 클래스를 생성하고 `@EmbeddedId` 어노테이션을 통해 식별자 클래스를 식별자로 가지는 엔티티를 만드는 방법이다. <br/><br/>
예제를 보면 더 이해하기 쉬울 것이다. <br/>
**MemberId.java** <br/>
```java
@Getter
@NoArgsConstructor
@EqualsAndHashCode
@Embeddable
public class MemberId implements Serializable {
    @Column(name = "memberNo")
    private int memberNo;
    
    @Column(name = "name")
    private String name;
}
```

**Member.java** <br/>
```java
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "member")
public class Member {
    @EmbeddedId
    private MemberId memberId;
    
    private String email;
    
    private String phoneNumber;
}
```

예제를 보면 먼저 복합 키 역할을 하는 식별자 클래스인 `MemberId`에 `@Embeddable` 어노테이션을 붙여준다. 그리고 엔티티 클래스에서 `@EmbeddedId` 어노테이션을 붙여서 해당 식별자 클래스를 Id로써 사용한다. <br/>
여기서 `@Embeddable`**을 사용하기 위한 식별자 클래스를 만들 때는 다음 조건들을 만족**해야만 한다. <br/>
1. 디폴트 생성자가 존재해야 한다.
    * 위 예제에서는 `@NoArgsConstructor` 어노테이션으로 디폴트 생성자 생성
2. 식별자 클래스의 접근 지정자는 `public` 으로 지정해야 한다.
3. `Serializable` 인터페이스를 구현해야 한다.
4. `equals`, `hashCode` 메서드를 재정의해야 한다.
    * 위 예제에서는 `@EqualsAndHashCode` 어노테이션으로 정의

이렇게 구현한 복합 키는 실제 레퍼지토리에서 다음과 같이 사용한다. <br/>
```java
public interface MemberRepository extends JpaRepository<Member, MemberId> { // 엔티티의 기본 키로 식별자 클래스 사용
    @Query("SELECT m FROM Member m WHERE m.memberId.memberNo = :memberNo")
    Optional<Member> findByMemberNo(int memberNo);
}
```

#### 2. @IdClass 사용
두 번째 방법은 `@IdClass` 라는 어노테이션을 사용하는 방법이다. <br/>
아까 `@Embeddable` 을 사용해서 복합 키를 구현했던 것처럼 해당 방법도 식별자 클래스를 별도로 생성해주고, 엔티티 클래스에서 `@IdClass` 어노테이션으로 만들어 준 식별자 클래스를 Id로 사용하도록 지정하는 방법이다. 하지만 `@Embeddable`을 사용하는 방법이랑 다른 점은 엔티티 클래스가 필드 내 식별자 클래스의 필드와 동일한 값을 가지며, 해당 필드들에 각각 `@Id` 어노테이션을 붙여준다는 점이다. <br/><br/>
이번에도 간단한 예제와 함께 살펴보자. <br/>
**MemberId.java** <br/>
```java
@Getter
@NoArgsConstructor
@EqualsAndHashCode
public class MemberId implements Serializable {
    private int memberNo;
    
    private String name;
}
```

**Member.java** <br/>
```java
@Getter
@Entity
@Table(name = "member")
@IdClass(MemberId.class)
public class Member {
    @Id
    private int memberNo;
    
    @Id
    private String name;
    
    private String email;
    
    private String phoneNumber;
}
```

예제를 보면 앞서 설명했던 것처럼, 우선 `MemberId` 라는 식별자 클래스를 만들고, 해당 클래스를 엔티티 클래스에서 `@IdClass` 어노테이션을 통해 식별자 클래스라고 지정해준다. 그리고 식별자 클래스의 필드인 `memberNo`, `name`를 엔티티에서도 똑같이 필드로 갖게 하고 각각 `@Id` 어노테이션을 지정해준 것을 볼 수 있다. <br/>
`@IdClass`를 사용하기 위한 식별자 클래스를 만들 때는 다음 조건을 만족해야 한다. <br/>
1. 식별자 클래스의 필드명과 엔티티에서 사용되는 필드명은 동일해야 한다.
    * 위 예제에서는 `@NoArgsConstructor` 어노테이션으로 디폴트 생성자 생성
2. 디폴트 생성자가 존재해야 한다.
3. 식별자 클래스의 접근 지정자는 `public` 으로 지정해야 한다.
4. `Serializable` 인터페이스를 구현해야 한다.
5. `equals`, `hashCode` 메서드를 재정의해야 한다.
    * 위 예제에서는 `@EqualsAndHashCode` 어노테이션으로 정의

### 어떤 방법을 선택했는가?
결론적으로 나는 `@Embeddable` **어노테이션을 사용하는 방식**을 선택했다. <br/><br/>
두 방식의 **단점**을 꼽아보면 `@Embeddable` 사용 방법은 **복합 키를 사용할 때** 번거롭다는 점이고, `@IdClass` 사용 방법은 **엔티티 클래스와 식별자 클래스를 만들 때** 번거롭다는 점이라고 생각한다. <br/>
`@IdClass` 사용 시 식별자 클래스 생성 조건을 보면 식별자 클래스에서 사용하는 필드를 엔티티 클래스에 동일하게 정의해줘야 한다고 되어있는데, 테이블의 구조가 크게 복잡하지 않다면 덜하겠지만 복잡한 테이블 구조에서 사용하기에는 휴먼 에러가 발생할 가능성도 있고 엔티티 클래스를 생성할 때 더 복잡할 수 있다는 이유로, `@Embeddable` 사용 방법으로 복합 키를 구현할 것을 선택했다. <br/><br/>
물론 `@Embeddable` 어노테이션을 사용하여 복합 키를 구현하면 JPQL 쿼리를 작성할 때 식별자 클래스까지 넣어줘야 한다는 점이 있지만, 쿼리는 한번 작성해두면 번거로울 점은 없기도 하며, `@Embeddable` 방법이 더 객체지향적이라는 이유도 선택하게 된 데 한 몫 했다. <br/>
