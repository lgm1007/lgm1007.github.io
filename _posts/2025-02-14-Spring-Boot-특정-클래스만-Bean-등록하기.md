---
layout:	post
title: Bean 등록의 끝, 나는 그 클래스만 선택해야 했다 (feat. @SpringBootTest classes 속성)
date: 2025-02-14 13:46:09 +0900
sitemap: 
image: technology-15.jpg
author: GyuMyung
tags: technology
comments: true
---

# Spring Boot 특정 클래스만 Bean 등록하기
## feat. `@SpringBootTest`의 `classes` 속성
### 개요
회사에서 통합테스트 환경을 구축하는 과정에서 통합테스트 작성 시 선언해줘야 하는 어노테이션의 재사용성을 위해 하나의 커스텀 어노테이션을 생성하여 관리하고자 했다. 여기서 회사 프로젝트의 특성 상 테스트 환경에서는 특정 Bean만 등록해줘야해서 `@SpringBootTest` 어노테이션의 `classes` 속성을 사용해주고 있었다.

```java
// ...
@SpringBootTest(classes = {AConfig.class, BConfig.class, CService.class})
class ExampleTest {
// ...
```

이런 상황에서 `@SpringBootTest` 까지 커스텀 어노테이션 안으로 포함시켜 관리하고 싶었고, 그러기 위해서는 커스텀 어노테이션의 속성으로 `classes` 가 추가되어야 하며 해당 속성으로 전달받은 Class 들만 Bean에 등록해줘야 하는 도전과제가 발생했다.

### 어떻게 해결했을까?
처음 시도했던 방법은 `TestExecutionListener`를 사용한 방법이었다. `TestExecutionListener` 인터페이스를 구현하면 테스트 클래스 수행 혹은 테스트 메서드 수행 전/후에 특정 동작을 수행할 수 있다. 이러한 특성을 이용해서 테스트 메서드가 수행하기 전에 특정 빈만 등록해주도록 커스텀 Listener 코드를 작성했다.

```java
public class IntegrationTestExecutionListener implements TestExecutionListener {
    // 테스트 메서드 수행 전에 Bean 등록하길 원하므로 beforeTestMethod 메서드를 오버라이드
    @Override
    public void beforeTestMethod(TestContext testContext) throws Exception {
        IntegrationTest integrationTest = testContext.getTestClass().getAnnotation(IntegrationTest.class);
        
        if (integrationTest != null && integrationTest.classes().length > 0) {
            Class<?>[] classes = integrationTest.classes();
            ConfigurableApplicationContext context = (ConfigurableApplicationContext) testContext.getApplicationContext();
        
            for (Class<?> clazz : classes) {
                BeanDefinitionBuilder builder = BeanDefinitionBuilder.genericBeanDefinition(clazz);
                context.registerBeanDefinition(clazz.getName(), builder.getBeanDefinition());
            }
        }
    }
}
```

그 다음 커스텀 어노테이션에 `@TestExecutionListeners` 어노테이션을 선언해서 작성해 준 `IntegrationTestExecutionListener.class`를 테스트 수행 리스너로 등록해줬다.
```java
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@TestExecutionListeners(listeners = {IntegrationTestExecutionListener.class})
@SpringBootTest
@SqlGroup({
    // @Sql(내용 생략)
})
@ActiveProfiles("test")
// ...
public @interface IntegrationTest {
    Class<?>[] classes() default {};
}
```

위 시도의 결과는 Bean 등록 실패였다. (`@SpringBootTest`에 대해 잘 알고 있는 사람들이라면 여기서 실패 원인을 발견할 수 있을 것이다.)<br/>
실패 원인이 `TestExecutionListener`를 사용하는 것이 아닌가? 해서 다음 방법으로 넘어갔다.<br/><br/>

다음 시도 방법은 `ApplicationContextInitializer`를 사용하는 방법이다. `ApplicationContextInitializer`를 사용하면 Spring Context가 초기화되기 전에 Bean을 등록해줄 수 있다.

```java
@Component
public class IntegrationTestContextInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {
    @Override
    public void initializer(ConfigurableApplicationContext applicationContext) {
        IntegrationTest integrationTest = applicationContext.getClass().getAnnotation(IntegrationTest.class);
        
        if (integrationTest != null && integrationTest.classes().length > 0) {
            Class<?>[] classes = integrationTest.classes();
            DefaultListableBeanFactory beanFactory = (DefaultListableBeanFactory) applicationContext.getBeanFactory();
            
            for (Class<?> clazz : classes) {
                BeanDefinitionBuilder builder = BeanDefinitionBuilder.genericBeanDefinition(clazz);
                beanFactory.registerBeanDefinition(clazz.getName(), builder.getBeanDefinition());
            }
        }
    }
}
```

그 다음 `@ContextConfiguration` 어노테이션을 선언해서 작성해 준 `IntegrationTestContextInitializer.class`를 사용할 수 있도록 등록해준다.
```java
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@ContextConfiguration(initializers = IntegrationTestContextInitializer.class)
@SpringBootTest
@SqlGroup({
    // @Sql(내용 생략)
})
@ActiveProfiles("test")
// ...
public @interface IntegrationTest {
    Class<?>[] classes() default {};
}
```

위 시도의 결과는 또 Bean 등록 실패였다.<br/>

### 진짜 문제는?
사실 위 `TestExecutionListener`과 `ApplicationContextInitializer`를 활용한 문제는 큰 문제가 없다. 문제는 바로 커스텀 어노테이션에서 선언해 준 `@SpringBootTest`에 있었다.<br/><br/>
`@SpringBootTest`를 일반적으로 선언해주면 프로덕트 소스 단에 있는 컴포넌트들을 모두 Bean으로 등록한다. 이 때 개인적으로 작성해줬던 `TestExecutionListener`이나 `ApplicationContextInitializer`에서 작성해 준 특정 Class를 Bean 등록해주는 동작이 서로 충돌하는 문제가 있던 것이다. 이를 해결하기 위해서는 `@SpringBootTest`가 어떠한 컴포넌트도 Bean으로 등록하지 못하게 해야 한다. 이를 위해 `classes` 속성에 아무 값도 넣어주지 않음으로써 해결했다.

```java
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@ContextConfiguration(initializers = IntegrationTestContextInitializer.class)
@SpringBootTest(classes = {})
@SqlGroup({
    // @Sql(내용 생략)
})
@ActiveProfiles("test")
// ...
public @interface IntegrationTest {
    Class<?>[] classes() default {};
}
```
