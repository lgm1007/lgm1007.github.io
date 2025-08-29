---
layout:	post
title: JPA 엔티티 컬럼 자동으로 암복호화
date: 2025-08-29 14:05:27 +0900
sitemap: 
image: programming-4.jpg
author: GyuMyung
tags: programming
comments: true
---

`jakarta.persistance` 패키지에는 `@Convert` 라는 어노테이션이 있다. 해당 어노테이션을 활용하면 JPA에서 특정 컬럼에 대해 DB 테이블에 데이터를 저장할 때 내용을 암호화하고, DB에서 데이터를 조회해올 때는 내용을 복호화하여 조회해올 수 있다.

이번 포스팅에서는 그 방법들을 Spring Data JPA 버전에 따라 다뤄보겠다.

## Spring Data JPA 버전 2.1 이상
먼저 `jakarta.persistence.AttributeConverter` 인터페이스를 구현한 컴포넌트 클래스를 정의해줘야 한다. 예제에서는 String 타입의 데이터를 암・복호화하는 과정을 다루겠다. 해당 클래스를 정의할 때 클래스 레벨에 `@Converter` 어노테이션을 선언해줘야 한다.

```kotlin
@Component
@Converter
class CryptConverter : AttributeConverter<String, String> {
    override fun convertToDatabaseColumn(attribute: String?): String? {}
    
    override fun convertToEntityAttribute(dbData: String?): String? {}
}
```

`AttributeConverter` 인터페이스를 구현한 다음 `convertToDatabaseColumn(attribute: String?)`, `convertToEntityAttribute(dbData: String?)` 메서드를 재정의해준다.

`convertToDatabaseColumn(attribute: String?)` 메서드는 DB에 데이터를 저장할 때 내용을 어떻게 변환할 것인지에 대해 정의해주는 메서드이며,<br>
`convertToEntityAttribute(dbData: String?)` 메서드는 DB에서 데이터를 조회해올 때 내용을 어떻게 변환할 것인지에 대해 정의해주는 메서드이다.

그럼 이제 우리는 데이터를 암・복호화를 해주는 로직을 구현하고, 해당 메서드에서 사용해주면 된다. 예시로 암・복호화를 해주는 서비스 레이어 컴포넌트를 정의해봤다. 참고로 암・복호화 기능을 구현하고자 하는거라 양방향 암호화 알고리즘을 사용해야 한다.

```kotlin
@Service
class EncryptionService {
    fun encrypt(data: String): String {
        // 암호화 내용 생략...
    }
    
    fun decrypt(data: String): String {
        // 복호화 내용 생략...
    }
}
```

```kotlin
@Component
@Converter
class CryptConverter(
    private val encryptionService: EncryptionService
) : AttributeConverter<String, String> {
    override fun convertToDatabaseColumn(attribute: String?): String? {
        return attribute?.let { encryptionService.encrypt(it) }
    }
    
    override fun convertToEntityAttribute(dbData: String?): String? {
        return dbData?.let { encryptionService.decrypt(it) }
    }
}
```

이렇게 `AttributeConverter`를 구현한 컴포넌트를 정의해준 다음 실제 데이터를 암・복호화를 할 Entity의 컬럼에 다음과 같이 `@Convert`를 선언해줘야 한다.

```kotlin
@Entity
class ExampleEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
    
    val userId: String,
    
    @Convert(converter = CryptConverter::class)
    val password: String
)
```

이제 데이터 저장 및 조회할 때 해당 컬럼이 암・복호화되는 것을 확인할 수 있다.

## Spring Data JPA 버전 2.1 미만
Spring Data JPA 버전 2.1 미만에서는 `@Component` 기반 Converter를 지원하지 않는다. `AttributeConverter`는 Hibernate 같은 영속성 제공자에 의해 관리되는 객체라 스프링의 IoC 컨테이너가 직접 관리하는 Bean이 아니다. 즉 `AttributeConverter`를 구현한 클래스를 Bean으로 등록하지 못해 DI를 해주지 못한다는 문제점이 있다.

물론 그렇다 하더라도 구현할 수 있는 방법이 있다. ApplicationContext holder를 임의로 정의해 스프링에서 관리 중인 Bean을 static하게 얻어올 수 있다.

아래와 같이 `ApplicationContextAware` 인터페이스를 구현한 컴포넌트를 정의해주면, 스프링 IoC 컨테이너 관리 범위 밖에서도 Bean을 꺼내올 수 있다.

```kotlin
@Component  
class SpringContext : ApplicationContextAware {  
  
    companion object {  
        private lateinit var context: ApplicationContext  
  
        fun <T> getBean(clazz: Class<T>): T {  
            return context.getBean(clazz)  
        }  
    }  
  
    override fun setApplicationContext(applicationContext: ApplicationContext) {
        context = applicationContext  
    }  
}
```

이후 `AttributeConverter`를 구현한 클래스에서는 아래와 같이 사용해주면 된다.

```kotlin
@Converter
class CryptConverter : AttributeConverter<String, String> {
    private val encryptionService: EncryptionService by lazy {
        SpringContext.getBean(EncryptionService::class.java)
    }

    override fun convertToDatabaseColumn(attribute: String?): String? {
        return attribute?.let { encryptionService.encrypt(it) }
    }
    
    override fun convertToEntityAttribute(dbData: String?): String? {
        return dbData?.let { encryptionService.decrypt(it) }
    }
}
```
