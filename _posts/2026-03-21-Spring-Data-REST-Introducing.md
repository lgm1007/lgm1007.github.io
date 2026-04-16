---
layout:	post
title: Spring Data REST를 사용한 건에 대하여
date: 2026-03-21 14:54:00 +0900
sitemap:
  changefreq: weekly
image: technology-22.png
author: GyuMyung
tags: technology
comments: true
---

## 개요

Spring Data REST는 Spring Data 기반의 리포지토리를 자동으로 RESTful API로 노출시켜주는 프레임워크이다. 즉 별도의 Controller를 작성하지 않아도 엔티티에 대한 CRUD API를 자동으로 생성해주기 때문에, 빠르게 REST API를 구축해야 하는 상황에서 매우 유용하다.

이번 포스팅에서는 Spring Data REST의 주요 개념과 함께, 다양한 경우에 대한 예제 코드를 통해 사용 방법을 자세히 알아보겠다.

## Spring Data REST란?

Spring Data REST는 **Spring Data 프로젝트**의 일부로, Spring Data JPA, Spring Data MongoDB 등 Spring Data의 리포지토리 인터페이스를 기반으로 RESTful API를 자동 생성해주는 라이브러리이다.

핵심 특징은 다음과 같다.

- **자동 REST API 생성** — `Repository` 인터페이스만 정의하면 CRUD 엔드포인트가 자동으로 만들어진다.
- **HATEOAS 지원** — 응답에 관련 리소스 링크가 자동으로 포함되어, 클라이언트가 API를 탐색하기 쉽다.
- **페이징 및 정렬** — 기본적으로 페이징과 정렬 기능이 내장되어 있다.
- **커스터마이징** — 이벤트 핸들러, 프로젝션, 밸리데이터 등을 통해 자동 생성된 API를 유연하게 확장할 수 있다.

## 프로젝트 설정

### 의존성 추가

Spring Boot 프로젝트에서 Spring Data REST를 사용하려면 다음 의존성을 추가하면 된다.

**Gradle (build.gradle.kts)**

```kts
dependencies {
    implementation("org.springframework.boot:spring-boot-starter-data-rest")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    runtimeOnly("com.h2database:h2") // 임시 인메모리 DB
}
```

**Maven (pom.xml)**

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-rest</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>runtime</scope>
    </dependency>
</dependencies>
```

### application.yml 설정

```yaml
spring:
  data:
    rest:
      base-path: /api          # REST API의 기본 경로 설정
      default-page-size: 20    # 기본 페이지 사이즈
      max-page-size: 100       # 최대 페이지 사이즈
      return-body-on-create: true   # POST 요청 시 생성된 엔티티를 응답 바디에 포함
      return-body-on-update: true   # PUT/PATCH 요청 시 수정된 엔티티를 응답 바디에 포함
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true
  h2:
    console:
      enabled: true
```

`spring.data.rest.base-path`를 설정하면 모든 엔드포인트 앞에 해당 경로가 붙게 된다. 예를 들어 위처럼 `/api`로 설정하면 엔드포인트가 `/api/members`, `/api/posts` 와 같이 생성된다.

## 기본 사용법

가장 기본적인 사용법을 엔티티와 리포지토리 정의를 통해 알아보자.

### 엔티티 정의

```kotlin
@Entity
class Member(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    var name: String,
    var email: String,
    var department: String,
)
```

### 리포지토리 정의

```kotlin
interface MemberRepository : JpaRepository<Member, Long>
```

이것만으로도 Spring Data REST가 자동으로 다음과 같은 CRUD API를 생성해준다.

| HTTP 메소드 | 엔드포인트 | 설명 |
|:-----------:|:----------|:-----|
| `GET` | `/api/members` | 전체 Member 목록 조회 (페이징) |
| `GET` | `/api/members/{id}` | 특정 Member 조회 |
| `POST` | `/api/members` | Member 생성 |
| `PUT` | `/api/members/{id}` | Member 전체 수정 |
| `PATCH` | `/api/members/{id}` | Member 부분 수정 |
| `DELETE` | `/api/members/{id}` | Member 삭제 |

### 응답 형태

`GET /api/members` 요청 시 다음과 같은 HAL(Hypertext Application Language) 형식의 JSON 응답이 반환된다.

```json
{
  "_embedded": {
    "members": [
      {
        "name": "홍길동",
        "email": "gildong@example.com",
        "department": "개발팀",
        "_links": {
          "self": {
            "href": "http://localhost:8080/api/members/1"
          },
          "member": {
            "href": "http://localhost:8080/api/members/1"
          }
        }
      }
    ]
  },
  "_links": {
    "self": {
      "href": "http://localhost:8080/api/members"
    },
    "profile": {
      "href": "http://localhost:8080/api/profile/members"
    }
  },
  "page": {
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "number": 0
  }
}
```

응답에 `_links` 필드가 포함되는 것이 특징인데, 이것이 HATEOAS의 핵심이다. 클라이언트는 이 링크를 따라가면서 API를 탐색할 수 있다.

## 리포지토리 커스터마이징

### @RepositoryRestResource

`@RepositoryRestResource` 어노테이션을 사용하면 엔드포인트 경로, 엔티티 이름 등을 커스터마이징할 수 있다.

```kotlin
@RepositoryRestResource(
    path = "users",                    // 엔드포인트 경로를 /api/users 로 변경
    collectionResourceRel = "users",   // 컬렉션 JSON 키 이름 변경
    itemResourceRel = "user",          // 단일 항목 JSON 키 이름 변경
)
interface MemberRepository : JpaRepository<Member, Long>
```

위와 같이 설정하면 기존 `/api/members` 경로 대신 `/api/users`로 API가 노출된다.

### exported 속성으로 API 노출 제어

특정 리포지토리나 메소드를 REST API로 노출시키지 않으려면 `exported = false`를 지정하면 된다.

```kotlin
@RepositoryRestResource(exported = false) // 이 리포지토리는 REST API로 노출되지 않음
interface InternalLogRepository : JpaRepository<InternalLog, Long>
```

특정 메소드만 비노출 처리하는 것도 가능하다.

```kotlin
interface MemberRepository : JpaRepository<Member, Long> {

    @RestResource(exported = false)
    override fun deleteById(id: Long)  // DELETE 엔드포인트만 비활성화
}
```

## 쿼리 메소드 노출

Spring Data JPA의 쿼리 메소드를 리포지토리에 정의하면, Spring Data REST가 자동으로 검색 엔드포인트를 생성해준다.

```kotlin
interface MemberRepository : JpaRepository<Member, Long> {

    fun findByDepartment(@Param("department") department: String): List<Member>

    fun findByNameContaining(@Param("name") name: String): List<Member>

    @RestResource(path = "byEmail", rel = "byEmail")
    fun findByEmail(@Param("email") email: String): Member?
}
```

위와 같이 정의하면 `/api/members/search` 경로 하위에 검색 엔드포인트가 자동 생성된다.

| 엔드포인트 | 설명 |
|:----------|:-----|
| `GET /api/members/search/findByDepartment?department=개발팀` | 부서별 검색 |
| `GET /api/members/search/findByNameContaining?name=길동` | 이름 포함 검색 |
| `GET /api/members/search/byEmail?email=gildong@example.com` | 이메일로 검색 |

`@Param` 어노테이션을 통해 쿼리 파라미터 이름을 지정할 수 있고, `@RestResource` 어노테이션의 `path` 속성으로 엔드포인트 경로를 직접 지정할 수도 있다.

## 엔티티 간 연관관계 처리

Spring Data REST는 엔티티 간의 연관관계도 자동으로 관리해준다. 연관관계를 가진 엔티티를 예제와 함께 살펴보자.

### 엔티티 정의

```kotlin
@Entity
class Post(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    var title: String,
    var content: String,

    @ManyToOne
    @JoinColumn(name = "member_id")
    var author: Member? = null,

    @OneToMany(mappedBy = "post", cascade = [CascadeType.ALL])
    val comments: MutableList<Comment> = mutableListOf(),
)

@Entity
class Comment(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    var content: String,

    @ManyToOne
    @JoinColumn(name = "post_id")
    var post: Post? = null,
)
```

```kotlin
interface PostRepository : JpaRepository<Post, Long>

interface CommentRepository : JpaRepository<Comment, Long>
```

### 연관관계 API 활용

엔티티 간의 연관관계는 자동으로 서브 리소스 형태로 노출된다.

**POST 생성 시 author 연결**

```bash
# 1. 먼저 Member 생성
POST /api/members
Content-Type: application/json
{
  "name": "홍길동",
  "email": "gildong@example.com",
  "department": "개발팀"
}

# 2. Post 생성 시 author를 URI로 연결
POST /api/posts
Content-Type: application/json
{
  "title": "Spring Data REST 사용기",
  "content": "Spring Data REST를 사용하면 빠르게 API를 구축할 수 있습니다.",
  "author": "http://localhost:8080/api/members/1"
}
```

연관관계를 연결할 때 엔티티의 URI를 사용하는 것이 중요한 포인트이다. 직접 `id` 값을 넣는 것이 아니라 해당 리소스의 URI 경로를 문자열로 전달해야 한다.

**연관된 리소스 조회**

```bash
# Post의 author 조회
GET /api/posts/1/author

# Post의 comments 조회
GET /api/posts/1/comments
```

## 프로젝션 (Projection)

기본적으로 Spring Data REST는 엔티티의 모든 필드를 응답에 포함시킨다. 하지만 특정 필드만 노출하거나, 연관된 엔티티의 필드까지 인라인으로 포함시키고 싶을 때가 있다. 이때 **프로젝션 (Projection)**을 사용하면 된다.

### 프로젝션 인터페이스 정의

```kotlin
@Projection(name = "summary", types = [Member::class])
interface MemberSummary {
    fun getName(): String
    fun getDepartment(): String
}
```

```kotlin
@Projection(name = "detail", types = [Post::class])
interface PostDetail {
    fun getTitle(): String
    fun getContent(): String
    fun getAuthor(): MemberSummary  // 연관된 Member를 인라인으로 포함
}
```

### 프로젝션 사용

사용 방법은 간단하다. 쿼리 파라미터로 `projection`을 전달하면 된다.

```bash
# Member의 summary 프로젝션 적용
GET /api/members?projection=summary

# Post의 detail 프로젝션 적용 (author 정보가 인라인으로 포함됨)
GET /api/posts/1?projection=detail
```

**summary 프로젝션 응답 예시:**

```json
{
  "name": "홍길동",
  "department": "개발팀",
  "_links": {
    "self": {
      "href": "http://localhost:8080/api/members/1"
    }
  }
}
```

기본 응답에서는 모든 필드가 노출되지만, `summary` 프로젝션을 적용하면 `name`과 `department` 필드만 반환되는 것을 확인할 수 있다.

### Excerpt 프로젝션

리포지토리에 `@RepositoryRestResource`의 `excerptProjection` 속성을 지정하면, 컬렉션 조회 시 기본적으로 해당 프로젝션이 적용된다.

```kotlin
@RepositoryRestResource(excerptProjection = MemberSummary::class)
interface MemberRepository : JpaRepository<Member, Long>
```

이렇게 설정하면 `GET /api/members` 호출 시 별도로 `?projection=summary`를 붙이지 않아도 `MemberSummary` 프로젝션이 자동으로 적용된다.

## 이벤트 핸들러

Spring Data REST는 엔티티의 생성, 수정, 삭제 전후에 실행되는 이벤트 핸들러를 제공한다. 비즈니스 로직을 추가하거나 검증을 수행할 때 유용하다.

### @RepositoryEventHandler 사용

```kotlin
@Component
@RepositoryEventHandler(Member::class)
class MemberEventHandler {

    private val log = LoggerFactory.getLogger(MemberEventHandler::class.java)

    @HandleBeforeCreate
    fun handleBeforeCreate(member: Member) {
        log.info("Member 생성 전: {}", member.name)
        // 예: 이름 공백 제거 등 전처리
        member.name = member.name.trim()
    }

    @HandleAfterCreate
    fun handleAfterCreate(member: Member) {
        log.info("Member 생성 완료: id={}, name={}", member.id, member.name)
        // 예: 알림 발송, 감사 로그 기록 등
    }

    @HandleBeforeSave
    fun handleBeforeSave(member: Member) {
        log.info("Member 수정 전: id={}", member.id)
    }

    @HandleBeforeDelete
    fun handleBeforeDelete(member: Member) {
        log.info("Member 삭제 전: id={}", member.id)
    }
}
```

사용 가능한 이벤트 어노테이션은 다음과 같다.

| 어노테이션 | 실행 시점 |
|:----------|:---------|
| `@HandleBeforeCreate` | POST 요청으로 엔티티 생성 전 |
| `@HandleAfterCreate` | 엔티티 생성 후 |
| `@HandleBeforeSave` | PUT/PATCH 요청으로 엔티티 수정 전 |
| `@HandleAfterSave` | 엔티티 수정 후 |
| `@HandleBeforeDelete` | DELETE 요청으로 엔티티 삭제 전 |
| `@HandleAfterDelete` | 엔티티 삭제 후 |
| `@HandleBeforeLinkSave` | 연관관계 변경 전 |
| `@HandleAfterLinkSave` | 연관관계 변경 후 |
| `@HandleBeforeLinkDelete` | 연관관계 삭제 전 |
| `@HandleAfterLinkDelete` | 연관관계 삭제 후 |

## Validator 적용

Spring Data REST에서 요청 데이터의 유효성 검증을 적용하는 방법을 알아보자.

```kotlin
@Component("beforeCreateMemberValidator")
class MemberValidator : Validator {

    override fun supports(clazz: Class<*>): Boolean {
        return Member::class.java.isAssignableFrom(clazz)
    }

    override fun validate(target: Any, errors: Errors) {
        val member = target as Member

        if (member.name.isBlank()) {
            errors.rejectValue("name", "name.required", "이름은 필수입니다.")
        }

        if (!member.email.contains("@")) {
            errors.rejectValue("email", "email.invalid", "올바른 이메일 형식이 아닙니다.")
        }
    }
}
```

Validator의 Bean 이름이 중요하다. Spring Data REST는 Bean 이름의 규칙을 따라 자동으로 Validator를 매핑한다.

| Bean 이름 패턴 | 적용 시점 |
|:--------------|:---------|
| `beforeCreate{엔티티명}Validator` | 생성 전 |
| `afterCreate{엔티티명}Validator` | 생성 후 |
| `beforeSave{엔티티명}Validator` | 수정 전 |
| `afterSave{엔티티명}Validator` | 수정 후 |

만약 Bean 이름 규칙 대신 직접 매핑하고 싶다면, 설정 클래스를 통해 등록할 수도 있다.

```kotlin
@Configuration
class RestValidationConfig(
    private val memberValidator: MemberValidator,
) : RepositoryRestConfigurer {

    override fun configureValidatingRepositoryEventListener(
        listener: ValidatingRepositoryEventListener,
    ) {
        listener.addValidator("beforeCreate", memberValidator)
        listener.addValidator("beforeSave", memberValidator)
    }
}
```

## Spring Data REST의 장단점

### 장점

- **빠른 프로토타이핑** — Controller, Service 레이어 없이 리포지토리만으로 REST API를 즉시 생성할 수 있다.
- **HATEOAS 자동 지원** — RESTful API의 핵심 원칙인 HATEOAS를 별도 구현 없이 지원한다.
- **페이징/정렬 기본 내장** — 별도 구현 없이 `?page=0&size=10&sort=name,asc` 형태로 사용 가능하다.
- **연관관계 관리** — 엔티티 간의 관계를 서브 리소스로 자동 관리해준다.

### 단점

- **복잡한 비즈니스 로직에 한계** — 단순 CRUD를 넘어서는 복잡한 로직은 결국 별도 Controller가 필요하다.
- **응답 형태 커스터마이징의 제약** — HAL 형식 기반이기 때문에 원하는 형태의 응답을 만들기 어려울 수 있다.
- **학습 곡선** — 프로젝션, 이벤트 핸들러, Validator 등 커스터마이징 방법에 대한 학습이 필요하다.
- **디버깅의 어려움** — 자동 생성된 API이기 때문에 문제가 발생했을 때 원인 파악이 어려울 수 있다.
