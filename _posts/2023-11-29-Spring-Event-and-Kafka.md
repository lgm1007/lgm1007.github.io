---
layout:	post
title: 사례로 보는 Spring Event & Kafka
date: 2023-11-29 21:38:49 +0900
image: technology-1.jpg
author: GyuMyung
tags: technology
comments: true
---

# Spring Event와 Kafka
## 예시 사례

문서 정리 작업을 수행하는 한 애플리케이션이 있다고 가정해보자. 정리할 문서들이 들어오고 정리 요청을 하게 되면 정리 작업이 수행된다.
<br/>

해당 애플리케이션에서 문서를 정리하는 작업에는 문서 내용 분석, 내용 별 분리, 불필요한 문서 정리 등 특정 작업 단계가 있고, 각 단계마다 정해진 정리 작업을 수행한다고 한다. <br/>
그리고 각 단계에서 수행해야 하는 정리 작업이 완료되면 해당 단계의 작업이 완료되었다고 알리고 다음 단계로 넘어간다고 한다.
<br/>

여기서, 작업이 완료되었음을 알리는 부분을 이벤트 드리븐으로 수행하고자 한다. 초기에는 이러한 부분을 Spring Event로 처리하려고 했다.

### Spring Event로 이벤트 처리하기

각 문서 정리 작업 수행 이벤트를 발행하는 핸들러 클래스
```java
import org.springframework.context.ApplicationEventPublisher;

@Slf4j
@Service
public class OrganizationEventHandler {
    private final OrganizationService organizationService;
    private final ApplicationEventPublisher publisher;
    
    // 각 이벤트 처리 로직 구현 ...
    
    // 문서 정리 작업 단위 수행 요청
    public void handleOrganizationStepRequest(final int organizationId, final OrganizationWork work) {
        try {
            // 작업 수행 후 다음 단계인 OrganizationStep이 반환
            final OrganizationStep step = organizationService.doOrganizeWork(organizationId, work);
            publisher.publishEvent(new OrganizationWorkFinishedEvent(organizationId, step));
        } catch (Exception e) {
            log.error(Map.of("organizationId", organizationId, "organizationWork", work), e);
        }
    }
}
```
<br/>

정리 작업 단위의 작업 완료 이벤트 클래스
```java
@Getter
@ToString
@EqualsAndHashCode(onlyExplicitlyInclude = true, callSuper = false)
public class OrganizationWorkFinishedEvent {
    // 문서 정리 작업 단위의 작업 완료 이벤트
    @EqualsAndHashCode.Include
    private final int organizationId;

    @EqualsAndHashCode.Include
    private final OrganizationStep step;
    
    public OrganizationWorkFinishedEvent(int organizationId, OrganizationStep step) {
        this.organizationId = organizationId;
		this.step = step;
    }
}
```
<br/>

발행된 이벤트에 따라 처리 로직을 수행하는 Listener 클래스
```java
@Component
@Slf4j
@RequiredArgsConstructor
public class OrganizationEventListener {
    private final OrganizationService organizationService;
    
    // 각 이벤트를 처리하는 리스너 메서드 구현 ...
    
    // 작업 단위 완료 이벤트 처리 로직
    @EventListener
    public void handleOrganizationWorkFinishEvent(OrganizationWorkFinishedEvent event) {
        organizationService.handleOrganizationWorkFinishedRespons(event.organizationId);
    }
}
```
<br/>

이런 방식으로 각 작업 단위의 완료 요청을 Spring Event 방식으로 구현하였고, 기능테스트를 진행했을 때는 문제없이 잘 동작하는 것처럼 보였다. <br/>
하지만 정리 요청이 다 건이 들어오는 경우에는 이벤트 처리가 정상적으로 되지 않는 문제가 보였다. <br/>
왜 이러한 문제가 나타나게 된건지는 Spring Event의 특징을 살펴보면 이해할 수 있다. <br/>
<br/>

### Spring Event의 특징
* **로컬 이벤트 전송** : Spring Event는 주로 애플리케이션 내에서 발생하는 로컬 이벤트를 처리한다.
* **동기적** : 주로 동기적으로 동작하며, 이벤트를 발생시킨 곳에서 바로 이벤트 핸들러가 호출된다.
* **단일 애플리케이션 내 사용** : 주로 동일한 JVM 내에서 이벤트를 전파하고, 다른 스레드에서 핸들링된다.
<br/>

바로 Spring Event는 기본적으로는 **동기적으로 동작**하여 다량의 동시 요청이 들어오면 순차적으로 동작을 수행하면서 성능에 영향을 미치고, Timeout 예외가 발생할 수도 있게 된다. <br/>
물론 Spring Event로도 다량의 동시 요청 동작을 처리하도록 설정할 수는 있다. <br/>
<br/>

### Spring Event로 동시 요청 처리하기
* **비동기 이벤트 처리**
  * `@Async` 어노테이션을 사용하여 비동기적으로 이벤트를 처리할 수 있도록 설정할 수 있다. 이를 통해 별도의 스레드에서 비동기적으로 실행할 수 있게 되어 동시성을 향상시킬 수 있다.
```java
@Async
@EventListener
public void handleOrganizationWorkFinishEvent(OrganizationWorkFinishedEvent event) {
    // 비동기적으로 처리할 내용
}
```
* **이벤트 분산**
  * 이벤트를 처리하는 서비스나 컴포넌트를 여러 인스턴스로 분산시키는 방법도 고려할 수 있다.
* **스레드 풀 사용**
  * Spring에서는 비동기 이벤트를 처리하기 위해 내부적으로 기본 스레드 풀을 사용하고 있다. 스레드 풀의 크기 또는 구성을 조정하여 시스템의 요구사항에 맞게 최적화한다.

<br/>

위에서 Spring Event로 동시 요청을 처리하는 방법들을 몇 가지 소개하고 있다. 물론 이러한 방법들을 사용해볼 수는 있겠지만 비동기 처리를 위한 설정도 고려해야 하고 무엇보다 애플리케이션에서 다량의 동시 요청에 대한 부하를 덜어줄 필요가 있다고 생각했다. <br/>
그러기 위해서는 외부 이벤트 드리븐 기술인 메시지 큐를 사용하는 것, 그리고 메시지 큐 중에서 가장 잘 알려진 Kafka를 사용하기로 결정하게 된다. <br/>
<br/>

### Kafka의 특징
* **분산 시스템 지원** : Kafka는 분산된 시스템 간의 메시지 전송을 위해 설계되었다.
* **비동기적** : Kafka는 비동기적으로 동작하며, 이벤트를 발행하면 브로커에서 메시지를 수신한 다음 구독자에게 전달된다.
* **클러스터 확장 기능** : 대규모 이벤트 스트림을 처리하거나 확장성을 고려할 때 좋은 대안이 된다.

### Kafka의 이점
* **대규모 이벤트 스트림 처리** : 대규모 이벤트 스트림을 처리하고 다뤄야 할 때 유용하다.
* **분산 시스템 간 통신** : 여러 서비스 또는 시스템 간의 이벤트 드리븐 통신에 유용하다.
* **내구성 Kafka** : 메시지를 영구적으로 보관하므로, 프로세스 장애 시에도 데이터를 보호하고 재생산할 수 있다.
<br/>

특히 Kafka와 같이 외부 이벤트 드리븐 기술을 사용하면 애플리케이션의 부하를 분산시켜준다는 이점이 있다. <br/>

이러한 특징들로 Kafka를 사용하게 되면 안정적인 이벤트 드리븐 아키텍처를 구성할 수 있고, 다량의 동시 요청에도 문제 없이 처리가 가능하도록 도와준다. <br/>

### Kafka로 이벤트 처리하기

각 문서 정리 작업 수행 토픽을 발행하는 핸들러 클래스
```java
@Slf4j
@Service
public class OrganizationEventHandler {
    private final OrganizationService organizationService;
    private final KafkaMessageSender messageSender;
    
    // 각 이벤트 처리 로직 구현 ...
    
    // 문서 정리 작업 단위 수행 요청
    public void handleOrganizationStepRequest(final int organizationId, final OrganizationWork work) {
        try {
            // 작업 수행 후 다음 단계인 OrganizationStep이 반환
            final OrganizationStep step = organizationService.doOrganizeWork(organizationId, work);
            messageSender.sendOrganizationWorkResponseMessage(organizationId, step);
        } catch (Exception e) {
            log.error(Map.of("organizationId", organizationId, "organizationWork", work), e);
        }
    }
}
```
<br/>

카프카 메시지를 Producing하는 Sender 클래스
```java
import org.springframework.kafka.core.KafkaTemplate;

@Slf4j
@Component
@RequiredArgsConstructor
public class KafkaMessageSender {
    private final KafkaTemplate kafkaTemplate;
    
    // 각 토픽에 대한 이벤트 처리 구현 ...
  
    public void sendOrganizationWorkResponseMessage(final int organizationId, final OrganizationStep step) {
        final String topic = "queuing.organization.work.response";
        kafkaTemplate.send(topic, new OrganizationWorkResponse(organizationId, step));
    }
}
```
<br/>

발송된 카프카 메시지를 Consuming하는 Listener 클래스
```java
@Slf4j
@Component
public class KafkaMessageListener {
    private final OrganizationEventHandler organizationEventHandler;
    
    @KafkaListener(topics = "queuing.organization.work.response", autoStartup = "false")
    public void listenOrganizationWorkResponse(final OrganizationWorkResponse request, final Acknowledgment acknowledgment) {
        try {
            // 해당 OrganizationStep의 정리 작업 수행 이벤트 발행 메서드 호출
            organizationEventHandler.handleOrganizeStepRequest(request.getOrganizationId(), request.getOrganizationStep());
        } catch (Exception e) {
            log.error(Map.of("organizationId", request.getOrganizationId(), "organizationStep", request.getOrganizationStep()), e);
        } finally {
            acknowledgment.acknowledge();
        }
    }
}
```
<br/>

메시지 파라미터용 객체
```java
@Getter
@ToString
@Builder
public class OrganizationWorkResponse {
    private int organizationId;
    private OrganizationStep organizationStep;
    
    @JsonCreator
    public OrganizationWorkResponse(@JsonProperty("organizationId") final int organizationId,
                                    @JsonProperty("organizationStep") final OrganizationStep organizationStep) {
        this.organizationId = organizationId;
        this.organizationStep = organizationStep;
    }
}
```

