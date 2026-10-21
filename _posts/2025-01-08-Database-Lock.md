---
layout: post
title: "MySQL 공유락과 배타락: 두 세션으로 FOR SHARE와 FOR UPDATE 비교하기"
date: 2025-01-08 16:41:09 +0900
last_modified_at: 2026-10-21
description: "MySQL InnoDB에서 공유락·배타락과 일반 SELECT의 차이를 구분하고, 두 연결을 이용한 잠금 대기 예제로 재고 변경 시 주의할 점을 설명합니다."
sitemap:
  changefreq: weekly
image: technology-14.jpg
author: GyuMyung
tags: technology
comments: true
---

재고를 읽은 뒤 차감하는 로직에서 중요한 질문은 “이 값을 읽을 수 있는가?”와 “차감하기 전까지 다른 요청이 값을 바꿀 수 있는가?”다. 두 질문은 같은 문제가 아니다. 일반 조회가 성공했다는 사실만으로 이후의 변경까지 보호되지는 않는다.

이 글은 **MySQL 8.4의 InnoDB**를 기준으로 공유락과 배타락을 비교한다. 다른 DBMS나 격리 수준에 그대로 적용하지 않도록, 예제의 격리 수준은 **READ COMMITTED**로 고정했다. 2026년 10월 21일 공식 `mysql:8.4` 이미지의 **MySQL 8.4.11**에서 두 독립 연결로 아래 동작을 확인했다. 테스트용 데이터만 사용했으며 운영 환경에서 발생한 장애 기록은 아니다.

> 2026-10-21 수정: 이전 글에서 `FOR UPDATE`를 공유락이라고 설명한 부분을 배타락으로 바로잡았다. 배타락이 다른 연결의 일반 `SELECT`까지 항상 막는다는 오해도 함께 수정했다.

## 먼저 구분할 세 가지 조회

| 조회 방식 | 이 예제에서 획득하는 행 잠금 | 다른 연결의 같은 행 변경 | 주된 목적 |
| --- | --- | --- | --- |
| 일반 `SELECT` | S/X 행 잠금을 획득하지 않는 일관 읽기 | 조회 때문에 막지 않음 | 보이는 데이터의 조회 |
| `SELECT ... FOR SHARE` | 공유락(S) | 잠금을 해제할 때까지 대기 | 읽은 행을 다른 트랜잭션이 변경하지 못하게 유지 |
| `SELECT ... FOR UPDATE` | 배타락(X) | 잠금을 해제할 때까지 대기 | 읽은 행을 이어서 변경하기 전에 확보 |

공유락끼리는 같은 행에서 함께 유지할 수 있다. 배타락은 다른 트랜잭션의 공유락·배타락과 충돌한다. `COMMIT` 또는 `ROLLBACK`으로 트랜잭션이 끝나면 해당 트랜잭션의 잠금도 해제된다. [MySQL: Locking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)

여기서 **다른 트랜잭션의 잠금과 충돌한다**는 말과 **모든 읽기를 차단한다**는 말을 구분해야 한다. InnoDB의 일반 `SELECT`는 READ COMMITTED와 REPEATABLE READ에서 MVCC를 이용한 일관 읽기로 처리된다. 다른 트랜잭션이 수정 중이더라도 보일 수 있는 커밋 버전을 읽을 수 있다. 스냅샷을 잡는 시점은 두 격리 수준에서 다르다. [MySQL: Consistent Nonlocking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)

## 실습 준비: 같은 DB에 연결한 두 터미널

테스트 전용 스키마에서 아래 테이블을 한 번 생성한다. 실습에 사용하는 상품 번호는 `id = 1`이다.

```sql
CREATE TABLE lock_demo_inventory (
    id BIGINT PRIMARY KEY,
    stock INT NOT NULL
) ENGINE = InnoDB;

INSERT INTO lock_demo_inventory (id, stock) VALUES (1, 10);
```

이제 **서로 다른 연결 A와 B**를 열고, 두 연결에서 각각 다음 설정을 실행한다. 같은 터미널에서 명령을 이어서 실행하면 별도 트랜잭션 간의 대기를 확인할 수 없다.

```sql
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET SESSION innodb_lock_wait_timeout = 30;
```

행 잠금을 유지하는 구간을 분명히 하기 위해 모든 실습에서 `START TRANSACTION`을 사용한다. B가 대기하는 동안 A로 돌아가서 커밋해야 한다. 30초 안에 해제하지 못해 잠금 대기 시간 초과가 발생하면 B에서 `ROLLBACK`한 뒤 해당 실습을 처음부터 다시 실행한다.

## 실습 1: 공유락끼리는 허용하고, 변경은 대기시킨다

**연결 A**에서 행을 읽고 트랜잭션을 열린 상태로 둔다.

```sql
START TRANSACTION;
SELECT stock FROM lock_demo_inventory WHERE id = 1 FOR SHARE;
-- 예상: stock = 10
```

**연결 B**에서도 같은 행에 공유락을 요청한다.

```sql
START TRANSACTION;
SELECT stock FROM lock_demo_inventory WHERE id = 1 FOR SHARE;
-- 예상: A가 커밋하지 않아도 stock = 10을 읽을 수 있다.
ROLLBACK;
```

B의 실습용 공유락을 해제한 뒤, **B에서 새 트랜잭션**을 시작해 값을 바꿔본다.

```sql
START TRANSACTION;
UPDATE lock_demo_inventory SET stock = stock - 1 WHERE id = 1;
-- 예상: A가 가진 공유락 때문에 여기에서 대기한다.
```

이 상태에서 **A에서 `COMMIT`**을 실행하면 B의 UPDATE가 진행될 수 있다. 실습 데이터를 유지하려면 UPDATE가 반환된 후 **B에서 `ROLLBACK`**한다.

이 순서는 “조회끼리는 함께 할 수 있지만 변경에는 기다림이 필요하다”는 차이를 드러낸다. 단, 두 연결이 모두 공유락을 가진 상태에서 서로 배타락으로 전환하려 하면 교착 상태가 발생할 수 있으므로, 갱신할 목적이라면 처음부터 필요한 잠금 방식을 선택해야 한다.

## 실습 2: 배타락과 일반 SELECT는 다른 방식으로 동작한다

앞 실습의 A와 B 트랜잭션을 모두 종료한 상태에서 시작한다. B의 UPDATE를 롤백했으므로 재고는 여전히 10이다.

**연결 A:**

```sql
START TRANSACTION;
SELECT stock FROM lock_demo_inventory WHERE id = 1 FOR UPDATE;
-- 예상: stock = 10. A가 해당 행의 배타락을 유지한다.
```

**연결 B:**

```sql
START TRANSACTION;
SELECT stock FROM lock_demo_inventory WHERE id = 1;
-- 예상: A의 잠금 해제를 기다리지 않고 커밋된 stock = 10을 읽는다.

SELECT stock FROM lock_demo_inventory WHERE id = 1 FOR UPDATE;
-- 예상: 이번에는 A의 배타락 때문에 대기한다.
```

이제 **A에서 변경 후 커밋**한다.

```sql
UPDATE lock_demo_inventory SET stock = stock - 1 WHERE id = 1;
COMMIT;
```

잠금을 획득한 B의 `FOR UPDATE`는 변경된 `stock = 9`를 읽었다. B도 `ROLLBACK`해서 트랜잭션을 끝낸다. 일반 조회와 잠금 조회를 함께 놓고 보면 “다른 연결에서 SELECT가 되니 잠금이 걸리지 않았다”는 판단이 왜 틀릴 수 있는지 알 수 있다.

검증에서는 단순히 응답이 늦어진 것만 보지 않고 `performance_schema.data_lock_waits`와 `data_locks`로 실제 잠금 대기도 확인했다.

| 확인한 조합 | 로컬 실습 결과 |
| --- | --- |
| A의 공유락 + B의 공유락 | B가 재고 10을 조회 |
| A의 공유락 + B의 UPDATE | X 잠금 대기 확인, A 커밋 후 B에서 9로 변경, B 롤백으로 10 복원 |
| A의 배타락 + B의 일반 SELECT | B가 대기 없이 커밋된 재고 10 조회 |
| A의 배타락 + B의 FOR UPDATE | X 잠금 대기 확인, A가 차감 후 커밋하자 B가 최신값 9 조회 |

## 재고 차감에서 어떤 방식을 선택할까?

한 상품의 재고가 충분할 때만 1개를 차감한다면, 읽기와 쓰기를 나누지 않는 조건부 UPDATE도 검토할 수 있다.

```sql
UPDATE lock_demo_inventory
SET stock = stock - 1
WHERE id = 1 AND stock >= 1;
```

애플리케이션에서는 **영향받은 행 수**를 확인한다. 이 예제에서는 1이면 차감 성공, 0이면 해당 상품이 없거나 조건을 만족하지 않은 것이다. 사전 조회에서 읽은 재고를 애플리케이션에서 계산한 뒤 덮어쓰는 방식보다 판단 지점을 한 SQL에 모을 수 있다.

주문 생성, 한도 확인 등 여러 판단과 변경이 함께 필요하다면 트랜잭션 범위 안에서 `FOR UPDATE`로 확보한 값을 사용하는 설계를 검토할 수 있다. 어느 쪽이든 중복 주문 방지나 여러 테이블의 원자성은 별도로 설계해야 한다. 행 하나를 잠근다고 주문 처리 전체가 완성되지는 않는다.

## 이 예제를 넓혀 적용할 때 확인할 점

- **잠금 범위:** 예제는 기본 키로 이미 존재하는 한 행을 찾는다. 범위 검색, 존재하지 않는 키, 인덱스가 다른 조건에서는 잠금 범위도 달라질 수 있다. [격리 수준과 인덱스 잠금](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)
- **조회 방식:** READ COMMITTED에서의 일반 조회 결과를 SERIALIZABLE이나 `INSERT ... SELECT` 등 다른 문장에 일반화하지 않는다. [SQL 문장별 잠금](https://dev.mysql.com/doc/refman/8.4/en/innodb-locks-set.html)
- **잠금 유지 시간:** 사용자 입력 대기나 외부 HTTP 호출까지 트랜잭션에 넣으면 다른 요청의 대기 시간도 늘어난다. 필요한 DB 작업의 경계를 먼저 정한다.
- **실패 처리:** 잠금 대기 시간 초과와 교착 상태를 구분하고, 실패한 트랜잭션의 정리 및 재시도 정책을 정한다. 재시도가 안전한 작업인지도 확인한다.

잠금 문제를 볼 때는 S/X라는 이름에 더해 **어떤 연결이, 어떤 SQL과 인덱스로, 언제부터 언제까지 잠금을 유지하는가**를 함께 기록하면 원인을 좁히기 쉽다.
