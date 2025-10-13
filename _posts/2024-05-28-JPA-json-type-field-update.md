---
layout:	post
title: JPA 값 타입 필드 업데이트를 원활히 하는 방법
date: 2024-05-28 21:00:00 +0900
sitemap: 
image: technology-21.jpg
author: GyuMyung
tags: technology
comments: true
---

# JPA 값 타입 필드 업데이트를 원활히 하는 방법
## 개요
실무에서 JPA를 사용하면서 엔티티의 json 필드의 특정 값을 업데이트하려고 하는데 정상적으로 동작하지 않았던 이슈를 소개하고, 이를 어떻게 해결했는지에 대해 다뤄보려 한다. <br/>

## 문제 상황
예를 들어, 다음과 같은 엔티티가 있다고 가정해보겠다. <br/>

```java
@Getter
@ToString(onlyExplicitlyIncluded = true, callSuper = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
@Entity
public class ExampleEntity {
    @Id
    @EqualsAndHashCode.Include
    @ToString.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int entitySeq;
    
    // 코드 생략 ...
    
    @Setter
    @Type(type = "json")
    private Properties properties = new Properties();
}

@Getter
@Setter
public class Properties implements Serializable {
    // 코드 생략 ...
    
    private String type;
    private boolean checked;
}
```

이와 같은 엔티티 구성에서 `Properties`필드의 `checked` 값을 업데이트하고자 했던 게 목적이었다. <br/>
그래서 `ExampleEntity`를 위한 `updater`객체를 생성하여 다음과 같이 업데이트 로직을 작성해줬다. <br/>

```java
@Component
@RequiredArgsConstructor
public class ExampleEntityUpdater {
    private final ExampleEntityRepository entityRepository;
    
    @Transactional
    public void updateExampleEntityPropertiesChecked(final int entitySeq, final boolean checked) {
        ExampleEntity entity = entityRepository.findById(entitySeq).orElseThrow(() -> new Exception("해당하는 ExampleEntity를 찾을 수 없습니다."));
        Properties properties = entity.getProperties();
        properties.setChecked(checked);
        entity.setProperties(properties);
        entityRepository.save(entity);
    }
}
```

물론 위와 같은 방법으로 업데이트를 하게 되면, 단 건에 대한 저장은 정상적으로 된다. <br/>
하지만 문제가 발생한 경우는 다음과 같이 연달아 해당 업데이트를 수행할 때 발생했다. <br/>

```java
@Service
@RequiredArgsConstructor
public class ExampleService {
    private final ExampleEntityUpdater entityUpdater;
    
    public void doSomething() {
        // 비즈니스 로직 ...
        
        Deque<Integer> tmpDeque = new ArrayDeque<>();
        
        for (int entitySeq : entitySeqList) {
            // 비즈니스 로직 ...
            
            tmpDeque.add(entitySeq);
        }
        
        // entity 하나는 true, 하나는 false로 업데이트하길 희망
        updateEntityPropertiesChecked(tmpDeque.removeFirst(), true);
        updateEntityPropertiesChecked(tmpDeque.removeFirst(), false);
    }
    
    private void updateEntityPropertiesChecked(final int entitySeq, final boolean checked) {
        entityUpdater.updateExampleEntityPropertiesChecked(entitySeq, checked);
    }
}
```

이러한 로직이 수행되면, 기대하는 동작은 엔티티 하나는 true, 하나는 false로 업데이트되는 동작을 기대할 것이다. <br/>
하지만 실제는 마지막에 false로 업데이트를 수행하면서 두 엔티티 모두 false로 업데이트되는 문제가 발생한다. <br/><br/>

해당 문제의 원인은 `ExampleEntityUpdater`의 로직에서 엔티티의 참조값인 `Properties` 객체를 바로 set 해주기 때문이라고 생각한다. <br/>

```java
ExampleEntity entity = entityRepository.findById(entitySeq).orElseThrow(() -> new Exception("해당하는 ExampleEntity를 찾을 수 없습니다."));
Properties properties = entity.getProperties();
properties.setChecked(checked);
entity.setProperties(properties);
```

다음 동작에서 `entity.getProperties();` 해서 조회해 온 properties 참조 값이 계속 영속화된 상태로 물려있는 게 아닐까 추측한다. 그래서 `properties.setChecked(checked);` 하게 되면 더티 체킹으로 결국, 마지막에 업데이트한 내용인 false로 이전 엔티티도 업데이트되는 것이 아닐까 한다. <br/>
따라서 이러한 문제를 해결하기 위해, 팀원분의 조언 + 관련 서적을 통해 **엔티티의 참조값을 사용하는 게 아닌 새로운 객체를 만들어 업데이트해주는 방식**으로 수정했다. <br/>

우선 `Properties` 객체에 다음과 같은 새로운 인스턴스를 생성하는 업데이트 메서드를 추가한다. <br/>

```java
@Getter
@Setter
@Builder
public class Properties implements Serializable {
    // 코드 생략 ...
    
    private String type;
    private boolean checked;
    
    public Properties updateChecked(final boolean checked) {
        return Properties.builder
            .type(this.type)
            .checked(checked)
            .build();
    }
}
```

그리고 해당 업데이트 메서드를 사용해서 다음과 같이 `ExampleEntityUpdater` 로직을 수정해준다. <br/>

```java
@Component
@RequiredArgsConstructor
public class ExampleEntityUpdater {
    private final ExampleEntityRepository entityRepository;

    @Transactional
    public void updateExampleEntityPropertiesChecked(final int entitySeq, final boolean checked) {
        ExampleEntity entity = entityRepository.findById(entitySeq).orElseThrow(() -> new Exception("해당하는 ExampleEntity를 찾을 수 없습니다."));
        Properties propertiesUpdated = entity.getProperties().updateChecked(checked);
        entity.setProperties(propertiesUpdated);
    }
}
```

이렇게 수정해주면서 엔티티에 참조된 값이 아닌 새로 생성된 객체를 set 해주게 되면서 원하던 방식으로 업데이트 동작을 수행할 수 있게 되었다. <br/>
