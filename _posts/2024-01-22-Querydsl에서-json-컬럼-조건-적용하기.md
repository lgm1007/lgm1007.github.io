---
layout:	post
title: QueryDsl에서 json 컬럼에 조건 적용하기
date: 2024-01-22 21:16:02 +0900
sitemap: 
image: programming-12.jpg
author: GyuMyung
tags: programming
comments: true
---

# QueryDsl에서 json 컬럼에 조건 적용하기

JPA를 사용하면서 DB에 Collection이나 Object 형태로 값을 저장하는 json 컬럼을 종종 사용하곤 한다. 그러다 간혹 QueryDsl 에서 json 컬럼에 저장된 값의 내용에 따라 조건을 적용해 SQL문을 실행하고 싶은 경우가 있다.


SQL문에서 json 문서에 조건을 사용하기 위해서는 각 DB 별로 지원하는 json 관련 함수를 사용할 수 있다.


Mysql에서 지원하는 json 관련 함수는 TIL에 작성한 해당 문서를 참고한다. [문서링크](https://github.com/lgm1007/TIL/blob/master/DB/R-DB/Mysql/Json%20%EB%8D%B0%EC%9D%B4%ED%84%B0%20%EA%B4%80%EB%A0%A8%20%ED%95%A8%EC%88%98.md)


QueryDsl에서 SQL 함수를 사용하기 위해 `Expressions.stringTemplate()`, `Expressions.numberTemplate()`, `Expressions.booleanTemplate()`를 사용한다. `string`, `number`, `boolean`은 사용하려 하는 SQL 함수의 반환 타입으로 결정한다.

### Expressions Template 메서드 사용하기
#### Mysql JSON_CONTAINS 함수 사용 예제
```java
JPAQueryFactory queryFacatory;
queryFactory
        .selectFrom(user)
        .where(Expressions.booleanTemplate(
                "JSON_CONTAINS({0}, {1}, {2})",
                user.properties,
                "seoul",
                "$.location"
        ))
    // ...
```
* `user` 테이블에서 `properties` 컬럼 내 `location` 키를 가진 값이 "seoul"이면 참인 조건을 사용한다.

#### Mysql JSON_EXTRACT 함수 사용 예제
```java
JPAQueryFactory queryFacatory;
queryFactory
        .selectFrom(user)
        .where(Expressions.stringTemplate(
                "JSON_EXTRACT({0}, '$.location')", user.properties).contains("seoul")
        )
    // ...
```
* 동작은 위 코드와 동일하게 `user` 테이블의 `properties` 컬럼 내 `location` 키를 가진 값이 "seoul"인 조건을 사용한다.
