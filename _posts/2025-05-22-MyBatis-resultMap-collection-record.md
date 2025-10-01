---
layout:	post
title: MyBatis는 Record를 외면했다. — 매핑 좀 하자니까!
date: 2025-05-22 17:31:10 +0900
sitemap: 
image: troubleshooting-5.jpg
author: GyuMyung
tags: troubleshooting
comments: true
---

### 이슈 내용
MyBatis에는 조회 쿼리 결과가 여러 rows로 조회되는 데이터를 객체의 Collection 필드에 담을 수 있는 기능이 있다.  
바로 `<resultMap/>` 태그 내 `<collection/>` 태그이다.

예를 들어 조회 결과가 이렇게 나오는 쿼리가 있다고 가정하자.

| user_id | tag_number |
| ------- | ---------- |
| 1       | 100        |
| 1       | 101        |
| 1       | 102        |

그리고 이러한 쿼리 결과를 담아 가져올 객체로 나는 Record로 다음과 같이 구성했다.

```java
public record UserTagNumberDto(
    Long userId,
    List<Integer> tagNumbers
) {
    @Builder
    public UserTagNumberDto {}
}
```

위 쿼리 결과와 이를 담을 객체를 매핑해주기 위해 MyBatis에서 `resultMap`을 이렇게 구성해준다.

```xml
<resultMap id="UserTagNumber" type="UserTagNumberDto">
    <id property="userId" column="user_id"/>
    <collection property="tagNumbers" javaType="java.util.List" ofType="int" column="tag_number"/>
</resultMap>
```

### 문제점
하지만 막상 이렇게 구성하고 실제로 실행해보면 이러한 에러가 발생한다.

```
org.apache.ibatis.reflection.ReflectionException:
Error instantiating class com.프로젝트경로생략.UserTagNumberDto
with invalid types (Long,List) or values (1,100)
Cause: java.lang.IllegalArgumentException: argument type mismatch
```

에러 메시지를 보면 `UserTagNumberDto` 객체를 생성하려고 할 때, `List` 타입의 파라미터에 단일 값 100을 넣으려고 하면서 발생한 이슈라고 한다.

### 문제 원인
Record는 불변 객체이다. 그리고 **MyBatis는 Record 객체를 불변으로 간주하여 List와 같은 컬렉션 필드도 불변한 필드로 인지하여 값 조작을 시도하지 않는다.**

### 해결 방법
Record가 아닌 Class 객체라면 동일한 id 값을 가지는 객체를 식별하여 List 필드에 값을 add 하는 식으로 처리하여 원하는 형태로 동작하게 된다.  
즉 객체를 Record에서 Class로 만들어줘야 한다. 이 때 기본 생성자 및 빌더 정의는 해줘야 MyBatis에서 객체를 생성하고 값을 매핑해줄 수 있다.

```java
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserTagNumberDto {
    private Long userId;
    private List<Integer> tagNumbers;
}
```

