---
layout:	post
title: 트랜잭션 락
date: 2024-12-18 13:40:31 +0900
sitemap: 
image: technology-13.jpg
author: GyuMyung
tags: technology
comments: true
---

# 트랜잭션 락
## 1. 비관적 락 (Pessimistic Lock)
### 설명
데이터 충돌 가능성이 **높다고 가정**하고 트랜잭션이 데이터에 접근할 때마다 락을 걸어 다른 트랜잭션의 접근을 제한하는 방식으로, 즉 **비관적인 관점**에서 데이터 충돌을 사전에 방지하는 방식이다.

DB 락의 공유락, 베타락 기법을 사용하는 방식이다. (각 DB 락의 세부적인 설명은 다음 [데이터베이스 락 게시글](https://lgm1007.github.io/2025/01/08/Database-Lock/)에서 확인할 수 있다.)

### 특징
1. **강제 잠금**: 데이터 (레코드) 읽기 또는 수정 시 다른 트랜잭션이 해당 데이터를 사용할 수 없도록 락을 걸어 데이터 충돌 완전히 방지
2. **실시간 대기**: 락이 해제될 까지는 다른 트랜잭션은 대기
3. **트랜잭션의 지연 증가 가능성**: 대기 시간이 길어질 경우 성능 저하가 일어날 수 있음

### 사용 예시
Spring JPA에서 `@Lock` 어노테이션과 `LockModeType.PESSIMISTIC_WRITE` 또는 `PESSIMISTIC_READ`를 활용하여 사용한다.

#### 읽기 전용 잠금 (`PESSIMISTIC_READ`)
데이터 읽기만 허용하고 수정은 제한한다.

```kotlin
@Lock(LockModeType.PESSIMISTIC_READ)
@Query("SELECT l FROM Lecture l WHERE l.id = :id")
fun findByIdWithReadLock(@Param("id") id: Long): Lecture
```

#### 쓰기 전용 잠금 (`PESSIMISTIC_WRITE`)
데이터 읽기/수정 시 다른 트랜잭션이 접근하지 못하도록 잠금

```kotlin
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT l FROM Lecture l WHERE l.id = :id")
fun findByIdWithWriteLock(@Param("id") id: Long): Lecture
```

## 2. 낙관적 락 (Optimistic Lock)
### 설명
데이터 충돌 가능성이 **낮다고 가정**하고 충돌이 발생하면 트랜잭션을 롤백하거나 재시도하는 방식으로, **DB Lock을 사용하는 방식이 아닌** 데이터를 수정할 때 데이터의 버전 정보를 활용하는 방식이다.

### 특징
1. **버전 기반 제어**: 데이터 변경 시 현재 버전 정보를 확인하여 충돌 여부 검증
2. **낮은 대기 시간**: 락이 없어도 작업을 진행할 수 있어 성능 저하가 적다.
3. **재시도 필요**: 만약 낙관적 락 충돌 발생 시 `OptimisticLockException` 예외가 발생하여 재시도 처리가 필요

### 사용 예시
Spring JPA에서 `@Version` 어노테이션을 사용해 구현한다.

#### 엔티티에 `@Version` 추가
```kotlin
@Entity
class Lecture(
    val title: String,
    @Version
    var version: Int? = null
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = 0
}
```

데이터 변경 시 JPA가 자동으로 버전 정보를 검증하는 방식이다.

## 정리

| 항목            | 비관적 락 (Pessimistic Lock) | 낙관적 락 (Optimistic Lock) |
|---------------|--------------------------|-------------------------|
| **충돌 발생 가능성** | ⏫높음 (충돌 방지)              | ⏬낮음 (충돌 허용)             |
| **동작 방식**     | 데이터 (레코드)에 잠금 설정         | 버전 정보를 이용해 충돌 검증        |
| **성능**        | ⏬잠금과 대기로 인해 성능 저하 가능      | ⏫DB 락을 사용하지 않으므로 높은 성능   |
| **적합한 상황**    | ⏫데이터 수정 충돌이 빈번한 경우        | ⏬데이터 수정 충돌이 드문 경우        |
| **데드락**       | ❌발생 가능 (충돌 시 대기하기 때문)    | ✅발생하지 않음 (충돌 시 예외 발생)   |
| **재시도 필요**    | ❌없음                      | ✅충돌 발생 시 재시도 처리 필요      |
