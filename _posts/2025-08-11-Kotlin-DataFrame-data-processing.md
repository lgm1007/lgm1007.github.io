---
layout:	post
title: 코틀린에서의 데이터 가공, Kotlin DataFrame과 함께
date: 2025-08-11 08:30:15 +0900
sitemap: 
image: programming-7.jpg
author: GyuMyung
tags: programming
comments: true
---

### Kotlin DataFrame
보통 데이터를 조작하거나 분석할 때 많이 사용되는 툴로 Python 진영의 `Pandas` 라이브러리를 주로 생각한다. 실무에서 메모리 상에서 이렇게 데이터를 다뤄야 하는 상황이 있을 때, 이 데이터 다루는 부분만 Python으로 구현해야하나 고민할 수도 있을 것 같다.

여기서 소개하는 라이브러리는 Kotlin 진영의 `Kotlin DataFrame` 이라는 라이브러리이다.
Kotlin DataFrame은 JetBrains 사에서 만든 데이터 분석 및 가공 라이브러리이다. Kotlin을 만든 JetBrains 사에서 만든 라이브러리인 만큼 Kotlin 공식으로 밀고 있는 라이브러리라서 계속 관리되어지고 있다. 또한 Kotlin 언어의 특성을 살려 타입 안정성과 확장성이 좋다는 특징도 가지고 있다.

[공식 Kotlin DataFrame GitHub Repository](https://github.com/Kotlin/dataframe)<br/>
[공식 Kotlin DataFrame 사이트](https://kotlin.github.io/dataframe/home.html)

단, Pandas만큼 범용적인 데이터 분석 및 가공 기능에 100% 전부 다 호환되지는 않는다는 점을 유의하자.

### 사용 예제
#### 데이터 분류
데이터 분류 예제를 작성함에 앞서, 다음과 같은 예제 데이터 클래스를 활용하겠다.

```kotlin
data class Person(
    val name: String,
    val job: String,
    val salary: Int
)

data class PersonGroupByJob(
    val job: String,
    val names: String,
    val sumSalary: Int
)
```

예제에서는 `job` 을 기준으로 분류를 하고, `job` 별로 `name`을 중복 없이 나열하고, `salary` 값을 합산하는 식으로 데이터를 가공해보겠다.

```kotlin
fun classifyPersonByJob(persons: List<Person>): List<PersonGroupByJob> {
    return persons.toDataFrame().groupBy("job") // job 기준으로 분류
        .aggregate { rows -> 
            rows.map{
                it["name"] as String
            }
            .distinct()
            .sorted()
            .joinToString(",") into "names"

            sum("salary") into "sumSalary"
        }
        .rows()
        .map { row -> 
            PersonGroupByJob(
                job = row["job"] as String,
                names = row["names"] as String,
                sumSalary = row["sumSalary"] as Int
            )
        }
}
```

예제에 대해 간단하게 설명하자면,
1. `(인스턴스 컬렉션변수).toDataFrame()`으로 DataFrame 변환
2. `.groupBy("job")` 으로 `job` 별로 그룹화
3. `.aggregate {...}` 블록에서 각 row 별로 데이터를 추출 및 가공하여 `into "컬럼명"` 으로 새 컬럼 지정

이렇게 `aggregate` 과정을 거치면 아래와 같이 DataFrame 컬럼이 만들어진다.

| job | names        | sumSalary |
| --- | ------------ | --------- |
| 의사  | 홍길동, 심청, 최콩쥐 | 30000     |
| 개발자 | 김첨지, 박돌쇠     | 15000     |

이렇게 DataFrame 컬럼이 만들어지면 그 후에는 해당 값을 담아줄 객체에 담아주는 식으로 변환해주면 된다.

#### 다중 키 데이터 분류
만약 2개 이상의 값을 기준으로 삼고 분류를 하고자 하는 경우에 대해 예제를 작성해보겠다.

```kotlin
data class Person(
    val name: String,
    val job: String,
    val hireType: String,
    val salary: Int
)

data class PersonGroupBy(
    val job: String,
    val hireType: String,
    val names: String,
    val sumSalary: Int
)
```

이번 예제에서는 `job`과 `hireType` 값을 기준으로 분류해보도록 하겠다.

```kotlin
fun classifyPersonGroupByJobAndHireType(persons: List<Person>): List<PersonGroupBy> {
    return persons.toDataFrame().groupBy("job", "hireType")
        .aggregate { rows ->
            rows.map{
                it["name"] as String
            }
            .distinct()
            .sorted()
            .joinToString(",") into "names"

            sum("salary") into "sumSalary"
        }
        .rows()
        .map { row -> 
            PersonGroupBy(
                job = row["job"] as String,
                hireType = row["hireType"] as String,
                names = row["names"] as String,
                sumSalary = row["sumSalary"] as Int
            )
        }
}
```

앞의 데이터 분류 예시와 비슷하나, `.groupBy()` 파라미터로 두 개의 값을 받는다는 점이 차이가 있다.

#### 데이터 조인
DataFrame 타입 데이터에 다른 DataFrame 타입 데이터를 합칠 수도 있다. 흔히 R-DB에서 하는 조인과 매우 유사한 기능이다.
조인 예제에서는 위에서 사용한 `Person` 클래스를 사용하고, 아래와 같은 예시 데이터를 준비했다.

```kotlin
val metaPerson = dataFrameOf(
    "name", "age", "address"
)(
    "홍길동", 30, "서울특별시 OO구 XX동",
    "심청", 20, "부산광역시 OO구 XX동"
)

data class PersonJoin(
    val name: String,
    val age: Int?,
    val address: String?,
    val job: String,
    val hireType: String,
    val salary: Int
)
```

위 예제 메타데이터와 left 조인하도록 하겠다.

```kotlin
fun leftJoinPerson(persons: List<Person>): List<PersonJoin> {
    // 왼쪽(persons.toDataFrame()) 기준으로 보존, metaPerson은 붙여주되 없으면 null
    persons.toDataFrame().leftJoin(metaPerson, by = "name")
        .rows()
        .map { row -> 
            PersonJoin(
                name = row["name"] as String,
                age = row["age"] as Int?,
                address = row["address"] as String?,
                job = row["job"] as String,
                hireType = row["hireType"] as String,
                salary = row["salary"] as Int
            )
        }
}
```

예제에서는 leftJoin을 다뤘지만, innerJoin (양쪽에 공통적으로 있는 키만 남김), rightJoin (오른쪽 `metaPerson` 기준 보존), outerJoin (양쪽 키 모두 남김) 도 제공한다.

### 마치며
Kotlin DataFrame은 이번 포스팅에서 다룬 분류와 조인 말고도 정렬/필터링/컬럼 추가/피벗 테이블 등 여러 데이터 가공 기능을 제공한다. 만약 본인이 참여 중인 프로젝트가 Kotlin으로 구성되어 있고, 데이터를 다양한 방식으로 가공해야 한다면, Kotlin DataFrame 사용을 고려해보는 것도 좋은 선택지가 될 것이다.
