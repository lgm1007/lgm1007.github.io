---
layout:	post
title: @TransactionalEventListener 로 동기 이벤트 처리 중 Connection 점유 이슈
date: 2025-04-22 11:24:11 +0900
sitemap: 
image: troubleshooting-4.jpg
author: GyuMyung
tags: troubleshooting
comments: true
---

### 이슈 내용
TransactionalEvent 처리를 동기로 하는 경우 이벤트를 발행하는 쪽의 트랜잭션이 Connection을 계속 점유한다는 이슈를 알게 되어, 이에 대해 정리해보려 한다.

### 발생 원인은?
Connection은 트랜잭션 동기화 자원이 모두 정리될 때까지 보유한다. 따라서 TransactionalEvent가 동기 방식으로 실행되면, `@TransactionalEventListener`의 기본 phase 옵션인 `AFTER_COMMIT`에 따라 트랜잭션이 성공적으로 커밋되면 해당 이벤트가 실행되고, 이벤트가 실행되는 동안에도 DB 커넥션을 점유하게 된다.
(여기서의 트랜잭션은 `@Transactional` 컨텍스트 안에서의 트랜잭션)

### 이 이슈로 발생할 수 있는 문제
예를 들어 다음과 같이 이벤트를 발행할 때에도, 이벤트 내에서도 DB INSERT 동작이 진행된다고 하고, Connection Pool 크기를 1로 설정했다고 해보자.

```java
@Service
@RequiredArgsConstructor
public class DocumentService {
	private final DocumentRepository documentRepository
	private final ApplicationEventPublisher eventPublisher;

	@Transactional
	public void writeDocument() {
		// 생략 ...
		documentRepository.save(document);
		eventPublisher.publishEvent(new AlertDocEvent(document));
	}
}
```

```java
@Component
@RequiredArgsConstructor
public class AlertEventListener {
	private AlertRepository alertRepository;

	@TransactionalEventListener
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void listenAlertDocEvent(AlertDocEvent event) {
		// 생략...
		alertRepository.save(alert);
	}
}
```

예제 코드를 보면 이벤트 발행하는 곳에서 Document 라는 DB 데이터를 INSERT 해주고 있고, 이벤트 내에서는 Alert 라는 DB 데이터를 INSERT 해주고 있다. `listenAlertDocEvent()` 에서 `@Async`를 따로 정의해주지 않았기 때문에 이 이벤트 리스너는 동기 방식으로 처리된다.

이 때 Document DB 데이터를 INSERT 한 후 그에 대한 DB Connection은 그대로 점유하고 있는 상태여서, Alert 데이터를 INSERT 하려할 때 Connection이 고갈되었기 때문에 이를 수행할 수 없게 된다. 따라서 Alert 데이터는 INSERT 되지 못한다.

이처럼 Connection 점유 이슈로 인한 Connection 고갈 문제가 발생할 수 있어 주의해야 한다.

### 이슈 예방 방법
가장 쉽게 해결할 수 있는 방법은 `@TransactionalEventListener` 리스너를 `@Async`와 함께 정의하여 비동기 방식으로 처리하면, 이벤트를 발행하는 쪽의 트랜잭션이 커밋된 후 Connection을 다시 반환하기 때문에 이러한 이슈가 발생하지 않는다.

