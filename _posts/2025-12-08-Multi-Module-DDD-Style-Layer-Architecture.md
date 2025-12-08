---
layout:	post
title:  멀티 모듈로  DDD의 4계층 구조 구성하기
date:   2025-12-08 20:47:07 +0900
sitemap: 
image:  programming-15.png
author: GyuMyung
tags:   programming
comments: true
---

## 4계층 구조 (4-Layered Architecture)
해당 프로젝트에서 DDD (Domain-Driven Design) 개발 방식을 최대한 따라가며 개발하고자 한다. DDD 원칙을 구현하기 위한 아키텍처로 보통 4계층 구조를 채택하는데, 해당 계층 구조는 주로 역할과 목적을 기반으로 구분한다.

| 계층                   | 역할                             | 목적                     |
| -------------------- | ------------------------------ | ---------------------- |
| User Interface       | 사용자의 명령 수락                     | 사용자와의 상호작용             |
| Application Layer    | 도메인 객체의 실행 흐름 관리 (트랜잭션 관리, 보안) | 비즈니스 유스케이스 구현          |
| Domain Layer         | 핵심 비즈니스 개념과 로직                 | 비즈니스 규칙의 모델링           |
| Infrastructure Layer | 영속성 처리, 외부 통신 등 기술적 구현         | 상위 계층을 지원하는 기술적 서비스 제공 |

## 왜 멀티 모듈을 도입했는가?
이러한 계층 구조에서 중요하게 여기는 원칙은 각 **계층 간 의존 방향**이 단방향으로 이루어져야 하며, 각 계층에서 위배되는 역할을 가지면 안 된다는 점이다. 보통 프로젝트에서 이러한 아키텍처를 구성할 때 단순 패키지 분리로만 구성하면 `import`로 어느 계층이던 접근이 가능해 앞서 말한 원칙이 깨져버리기 쉽다.

하지만 멀티 모듈을 활용하면 이를 물리적으로 막아줄 수 있다.

첫 번째 **의존성 방향**, 만약 `domain` 모듈의 `build.gradle` 설정 파일에 `infrastructure` 모듈에 대한 의존성을 추가하지 않으면, `domain` 모듈 코드상에서 절대 `infrastructure` 모듈의 클래스를 import 할 수 없다.

두 번째 **도메인 모듈의 순수성 유지**, `domain` 모듈은 비즈니스 로직을 담아내는 핵심 모듈이며, Spring MVC, DB 같은 외부 프레임워크 및 라이브러리 의존성을 일체 갖지 않음으로써 비즈니스 로직이 특정 기술에 오염되지 않도록 강제되어야 한다. 이 또한 `domain` 모듈의 `build.gradle` 파일에 특정 기술에 대한 의존성을 아예 추가하지 않는 것으로 해결할 수 있다.

멀티 모듈은 계층 구조를 견고하게 만들어주는 용도 뿐 아니라 **빌드 최적화**라는 관점에서도 장점이다. Gradle은 변경된 모듈만 다시 빌드한다. 예를 들면 `infrastructure` 모듈에서 수정이 일어났다면, `infrastructure` 모듈 의존성이 없는 `domain` 모듈이나 `application` 모듈은 다시 컴파일하지 않는다. 따라서 프로젝트 규모가 커질수록 빌드 속도 차이에서 큰 차이가 날 것이다.

## 직접 구성해보자
먼저 각 계층 별로 다음과 같이 패키지를 구성했다.

```
domain (Domain Layer)
application (Application Layer)
infrastructure (Infrastructure Layer)
web (User Interface)
```

그리고 각 패키지 별로 `build.gradle`을 지니고 있는 모듈로 구성한다. 가장 먼저 `domain` 모듈은 순수성을 유지해야 하기 때문에, 별다른 외부 의존성은 추가하지 않았다. Kotlin JVM 플러그인과 테스트 코드 작성용 JUnit5 테스트 의존성 정도로만 추가하였다.

```gradle
plugins {  
    id 'org.jetbrains.kotlin.jvm' version "${kotlinVersion}"  
}  
  
dependencies {  
    testImplementation 'org.jetbrains.kotlin:kotlin-test-junit5'  
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'  
}  
```

다음으로 `application` 모듈 구성인데, 우선 `domain` 모듈 의존성을 지니고 있어야하며, Spring Boot 자원을 사용하므로 `spring-boot` 의존성, 트랜잭션 관리를 위한 `JPA` 의존성과 JWT 발급을 위한 `JWT` 의존성을 추가하였다.

```gradle
plugins {
    id 'org.jetbrains.kotlin.jvm' version "${kotlinVersion}"  
    id 'org.jetbrains.kotlin.plugin.spring' version "${kotlinVersion}"  
    id 'org.jetbrains.kotlin.plugin.jpa' version "${kotlinVersion}"
    id 'org.springframework.boot' version "${springBootVersion}"  
    id 'io.spring.dependency-management' version "${springDependencyManagementVersion}"
}

dependencies {  
    implementation(project(":domain"))  
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'  
    implementation 'org.springframework.boot:spring-boot-starter-web'  
  
    // jwt  
    implementation("io.jsonwebtoken:jjwt-api:0.11.5")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.11.5")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.11.5")
    
    testImplementation 'org.jetbrains.kotlin:kotlin-test-junit5'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}
```

다음으로 `infrastructure` 모듈 구성이다. `infrastructure` 모듈에서는 `domain` 모듈과 `application` 모듈의 의존성을 지니고 있고, `spring-boot`, `JPA`, 그리고 해당 프로젝트에서 사용하는 DBMS인 `PostgreSQL` 의존성을 추가하였다.

```gradle
plugins {  
    id 'org.jetbrains.kotlin.jvm' version "${kotlinVersion}"  
    id 'org.jetbrains.kotlin.kapt' version "${kotlinVersion}"  
    id 'org.jetbrains.kotlin.plugin.spring' version "${kotlinVersion}"  
    id 'org.jetbrains.kotlin.plugin.jpa' version "${kotlinVersion}"  
    id 'org.springframework.boot' version "${springBootVersion}"  
    id 'io.spring.dependency-management' version "${springDependencyManagementVersion}"  
}

dependencies {
    implementation(project(":domain"))
    implementation(project(":application"))
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'  
    implementation 'org.springframework.boot:spring-boot-starter-web'  
    implementation 'org.springframework.boot:spring-boot-starter-webflux'  
    implementation 'com.fasterxml.jackson.module:jackson-module-kotlin'  
    implementation 'org.jetbrains.kotlin:kotlin-reflect'  
    implementation 'org.jetbrains.kotlin:kotlin-stdlib-jdk8'  
      
    // postgreSQL  
    runtimeOnly 'org.postgresql:postgresql'  
      
    testImplementation 'org.jetbrains.kotlin:kotlin-test-junit5'  
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}
```

마지막으로 `web`, User Interface 계층 모듈의 구성이다. `web` 모듈은 프로젝트를 구동하는 메인 모듈이기 때문에 모든 모듈에 대한 의존성을 지니고, `bootJar` 및 `build` 태스크는 물론, 프로젝트에서 필요한 태스크에 대한 설정을 모두 지니고 있는다.

```gradle
plugins {  
    id 'org.jetbrains.kotlin.jvm' version "${kotlinVersion}"  
    id 'org.jetbrains.kotlin.kapt' version "${kotlinVersion}"  
    id 'org.jetbrains.kotlin.plugin.spring' version "${kotlinVersion}"  
    id 'org.springframework.boot' version "${springBootVersion}"  
    id 'io.spring.dependency-management' version "${springDependencyManagementVersion}"  
    id 'org.asciidoctor.jvm.convert' version "${asciidoctorConverterVersion}"  
}

dependencies {  
    implementation(project(':domain'))  
    implementation(project(':application'))  
    // infrastructure 구현체는 실행 시에만 필요하므로 런타임에만 추가  
    implementation(project(':infrastructure'))  
    implementation 'org.springframework.boot:spring-boot-starter-security'  
    implementation 'org.springframework.boot:spring-boot-starter-web'  
  
    testImplementation 'org.springframework.boot:spring-boot-starter-test'  
    testImplementation 'org.jetbrains.kotlin:kotlin-test-junit5'  
    
    // RestDocs
    testImplementation 'org.springframework.restdocs:spring-restdocs-mockmvc'  
    testImplementation 'org.springframework.restdocs:spring-restdocs-asciidoctor'  
    testImplementation 'org.springframework.restdocs:spring-restdocs-restassured'  
    testImplementation 'io.rest-assured:spring-mock-mvc'  
    testImplementation 'org.springframework.security:spring-security-test'  
    testImplementation 'com.ninja-squad:springmockk:4.0.0'  
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'  
}

tasks.withType(KotlinCompile).configureEach {  
    kotlinOptions {  
        jvmTarget = '17'  
        freeCompilerArgs += ['-Xjsr305=strict']  
    }  
}  
  
test {  
    outputs.dir snippetsDir  
    useJUnitPlatform()  
}  
  
tasks.named('asciidoctor') {  
    inputs.dir snippetsDir  
    dependsOn tasks.test  
    doLast {  
        copy {  
            from("build/docs/asciidoc")  
            into("src/main/resources/static/docs")  
        }  
    }}  
  
tasks.named('bootJar') {  
    enabled = true  
    dependsOn tasks.asciidoctor  
  
    from('build/docs/asciidoc') {  
        into 'BOOT-INF/classes/static/docs'  
        duplicatesStrategy = DuplicatesStrategy.EXCLUDE  
    }  
}  
  
tasks.named('jar') {  
    enabled = false  
}  
  
tasks.named('build') {  
    dependsOn tasks.bootJar  
}  
  
kotlin {  
    jvmToolchain(17)  
}
```

## 번외. DDD의 Domain 모델 구성
앞으로 DDD 프로젝트 진행하면서 Domain 모듈에서 구성하는 모델 형태이다.

#### Entity
- 식별자로 구분되는 도메인 객체
- 시간이 지나도 동일성을 유지하는 객체
- 예시) `Account`, `User`

#### VO (값 객체)
- 식별자가 없고, 값이 같으면 같은 것으로 취급하는 객체
- 주로 불변 객체
- 예시) `Email`, `Address`, `PasswordHash`

#### Aggregate Root
- 하나 이상의 엔티티/값 객체를 묶은 일관성 단위
- 집합 전체를 대표하는 엔티티
- Aggregate Root만 Repository에서 직접 조회/저장
- 외부에서는 내부 엔티티에 직접 접근하지 않고, 루트를 통해 조작한다.

#### Repository
- Aggregate Root 단위로 조회/저장 담당
- 예시) `AccountRepository`

#### DDD 개념 적용 예제
Account를 하나의 Aggregate Root로 본다면 다음과 같은 구성으로 볼 수 있다.
- **Aggregate Root**: `Account`
- **VO**: `Email`, `PasswordHash`, `Role` 등
- **Repository**: `AccountRepository`

```kotlin
data class Account(
    val id: Long?,
    val email: Email,
    val password: PassWordHash,
    val roles: Set<Role>,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
)

data class Email(val value: String) {
    init {
        required(value.contains("@")) { "Invalid email" }
    }
}

data class PasswordHash(val value: String)

enum class Role {
    ADMIN,
    USER
}
```
