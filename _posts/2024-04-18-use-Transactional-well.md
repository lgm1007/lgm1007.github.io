---
layout:	post
title: 우리는 같은 트랜잭션이었지만, 전파 레벨이 달랐을 뿐이야
date: 2024-04-18 22:13:59 +0900
sitemap: 
image: language-9.jpg
author: GyuMyung
tags: language
comments: true
---

### 개요
실무 업무를 하던 중 예기치 못하게 DB에서 특정 ID 값을 가진 데이터를 찾을 수 없다는 이슈가 발생했다. 처음에는 데이터를 생성해주는 로직에서의 문제인 줄 알았지만, 동일한 로직을 사용하는 다른 곳에서는 정상적으로 동작하는 것을 확인하고 아닌 것을 확인했다. 팀원들과 모여서 문제의 로직을 따라가보며 확인해보니 `@Transactional`에 대한 정확한 이해 없이 잘못 선언해주고 있던 게 원인이었다. <br/><br/>

### 문제의 코드
문제를 겪은 상황과 비슷한 예제 코드를 작성해보았다. <br/>
```java
@Transactional
public void outerMethod() {
    // 내부 로직 ...
    
    int newEntityId = 엔티티_생성_메서드();
    생성_엔티티_사용_메서드(newEntityId);
}

public int 엔티티_생성_메서드() {
    // 엔티티 생성 로직
    
    return entityAppender.save(exampleEntity).getId();
}

public void 생성_엔티티_사용_메서드(final int entityId) {
    엔티티_상태_변경_메서드(entityId);
    
    publisher.publishEvent(new AsyncApiEvent(entityId));
	
    // AsyncApiEvent가 완료되었는지 주기적 체크 로직
}
```
```java
public void 엔티티_상태_변경_메서드(final int entityId) {
    ExampleEntity entity = entityReader.getById(entityId);
    entityUpdate(entity, EntityStatus.STATE);
}
```
```java
public void asyncApiEvent_메서드(final int entityId) {
    // 내부 로직 ...

    ExampleEntity entity = entityReader.getById(entityId);  // not_fount_entity
}
```

위 예제는 비즈니스 로직을 간단히 표현한 코드이다. <br/>
그리고 아래는 `EntityRepository`에 접근하여 데이터를 저장하고, 조회하고, 업데이트하는 `appender`, `reader`, `updater` 클래스이다.

```java
@Component
@RequiredArgsConstructor
@Transactional
public class EntityAppender {
    private final EntityRepository entityRepository;
    
    public ExampleEntity save(final ExampleEntity entity) {
        return entityRepository.save(entity);
    }
}
```
```java
@Component
@RequiredArgsConstructor
@Transactional
public class EntityReader {
    private final EntityRepository entityRepository;
    
    public ExampleEntity getById(final int entityId) {
        return entityRepository.findById(entityId)
                .orElseThrow(() -> new NotFountException("not_fount_entity"));
    }
}
```
```java
@Component
@RequiredArgsConstructor
@Transactional
public class EntityUpdater {
    private final EntityRepository entityRepository;
    
    public ExampleEntity updateEntityState(final ExampleEntity entity, final EntityStatus status) {
        entity.updateStatus(status);
        return entityRepository.save(entity);
    }
}
```

여기서 나는 제일 상단의 메서드인 `outerMethod()`에도 `@Transactional`이 선언되어 있지만, `EntityAppender` 클래스에도 `@Transactional` 이 선언되어 있으니까 `엔티티_생성_메서드()`에서 `entityAppender.save()` 호출해준 후에 DB에 엔티티 데이터가 저장이 되는 줄 알았다. <br/>
실제로 기능테스트 하면서 `생성_엔티티_사용_메서드()` 내부에서 호출하는 `엔티티_상태_변경_메서드()`에서 `entityReader.getById()`로 레파지토리에서 해당 엔티티를 조회해오는 로직은 정상적으로 통과한 것을 확인했다. <br/>
**하지만** `asyncApiEvent_메서드()` 내부에서 `entityReader.getById()`로 조회를 하려고 하니 `NotFoundException`이 발생하는 것이었다! <br/><br/>

### 문제의 이유
왜 `asyncApiEvent_메서드()`에서 조회를 할 때는 `NotFountException`이 발생했을까? 그건 바로 실제로 DB에는 데이터가 저장되지 않은 상태였기 때문인데, 왜 DB에 저장되지 않았느냐? 그건 **`@Transactional` 전파 레벨에 대해 제대로 알지 못했기 때문이다.** <br/>
`outerMethod()` 메서드에 선언한 `@Transactional`과 `appender`, `updater` 등의 클래스에 선언한 `@Transactional`은 **같은 전파 레벨을 가지고 있다.** <br/><br/>
JpaRepository의 `save()`는 실행되면 영속성 컨텍스트에 해당 엔티티를 저장하고 있고, 트랜잭션이 정상적으로 종료되어 커밋될 때 실제 DB로 데이터 저장이 이루어진다. <br/> 
`findByXXX()` 조회 메서드는 영속성 컨텍스트의 1차 캐시에서 찾으려 하는 엔티티가 존재하면 해당 엔티티를, 없으면 DB에서 SQL을 수행하여 조회해온다. <br/><br/>
따라서 `outerMethod()` 메서드의 레벨에 걸린 트랜잭션 전파 레벨 내에서 `save()`가 수행되고, `findById()` 가 수행되었기 때문에, `엔티티_상태_변경_메서드()` 내부에서 수행한 엔티티 조회 동작은 영속성 컨텍스트 1차 캐시에서 조회해서 정상적으로 수행된 것이다. <br/>
하지만 `AsyncApiEvent`로 이벤트 발행되어 호출하도록 된 `asyncApiEvent_메서드()` 내부에서의 엔티티 조회 동작은 같은 트랜잭션 전파 레벨이 아니다. 게다가 `생성_엔티티_사용_메서드()`에서 `asyncApiEvent_메서드()` 동작이 완료되었는지 대기하고 있는 로직 때문에 메서드는 종료되지 않고 있고, **트랜잭션은 커밋되지 않은 상태라 DB에도 저장되지 않은 상태**인 것이다. <br/>
그래서 `asyncApiEvent_메서드()`에서 수행한 조회 동작은 `NotFoundException`이 발생할 수밖에 없는 것이었다. <br/><br/>

### 알게된 점
`@Transactional`이 걸린 외부 메서드 안에서 호출되는 메서드에 `@Transactional`을 걸어도 같은 전파 레벨이라는 점은 처음 알게 되었다. <br/>
그래서 사실 JPA 관련 강의나 기술블로그를 보면 `@Transactional`을 무의식적으로 다는 행위는 피해야 한다고 한다. <br/>
**트랜잭션 적용 범위에는 필요한 로직만** 호출할 수 있도록 주의해야 한다. <br/><br/>
실제로 실무에서도 위 이슈를 `outerMethod()`에 `@Transactional`을 선언하지 않고 좀 더 세부적으로 트랜잭션 범위를 나눠서 해결했다. <br/>

여기서 다룬 이슈와 관련된 괜찮은 유튜브 영상을 추천한다. <br/>
[@Transactional을 사용하지 말자 - 제미니의 개발실무](https://youtu.be/mB3g3l-EQp0?si=vptTHyv_mFKAuPs6)
