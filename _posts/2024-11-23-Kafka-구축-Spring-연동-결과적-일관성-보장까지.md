---
layout:	post
title: Spring Boot 카프카 연동과 결과적 일관성 보장하기까지
date: 2024-11-23 12:07:37 +0900
sitemap: 
image: technology-12.jpg
author: GyuMyung
tags: technology
comments: true
---

## 개요

카프카의 서버 구축부터 Spring Boot 와 카프카를 연동해보고, 더 나아가 카프카 메시지 발행의 결과적 일관성을 보장하는 방법까지 다뤄본다.

(본 포스팅에서 다루는 프로젝트는 다음 [이커머스 프로젝트](https://github.com/lgm1007/hhplus_ecommerce)입니다.)

## 카프카 톺아보기
### 카프카?

카프카 (Kafka)는 링크드인에서 처음 개발된 오픈소스로, 그 당시 링크드인은 수많은 데이터를 실시간으로 처리하는 과정에서 많은 어려움을 겪고 있었다. 그 당시의 링크드인은 데이터를 전송하고 수신하는 과정에서 다수의 프로듀서와 컨슈머가 필요에 따라 개별적으로 연결을 가져가는 구조였으며, 그로 인해 하나의 시스템이 추가되어도 통신 구조가 기하급수적으로 복잡해지는 문제가 있었다. (M * N 구조)

![](https://github.com/user-attachments/assets/63e2a390-b267-4670-8862-4ab308d1c48e)

이를 해결하기 위해 중앙 집중화된 메시지 및 데이터의 흐름을 관리하는 구조를 가져가기로 결정했고, 그 과정에서 카프카가 개발되었다.

![](https://github.com/user-attachments/assets/69e18fb3-9e44-4b82-87d9-f3f2d1e9ca14)

카프카는 기존 메시지 큐 시스템인 RabbitMQ, ActiveMQ 와 비교할 때 처리량과 처리 속도, 가용성과 확장성이 월등히 앞서면서 여러 IT 회사들에서 채용하며 운영하는 시스템이 되었다.

### 카프카의 구성 요소

카프카를 구성하고 있는 각 요소 별로 알아보며 카프카 전체의 개념을 파악해보자.

#### 브로커 (Broker)

하나의 카프카 서버를 브로커라고 한다. 브로커는 프로듀서로부터 메시지를 수신하고 오프셋을 지정한 후 해당 메시지를 디스크에 저장한다. 그리고 컨슈머의 파티션 읽기 요청에 응답하고 디스크에 저장된 메시지를 전송한다.

카프카의 브로커는 클러스터 (Cluster)의 일부 구성원으로 동작하도록 설계되었다. 여러 개의 브로커가 하나의 클러스터에 포함될 수 있으며, 그 중 하나는 클러스터의 컨트롤러 (Controller) 역할을 수행한다. 컨트롤러는 클러스터 내의 각 브로커에게 담당 파티션을 할당하고, 브로커들이 정상적으로 동작하는지 모니터링한다.

#### 클러스터 (Cluster)

여러 대의 분선 서버를 네트워크로 연결하여 마치 하나의 거대한 서버처럼 동작하도록 만드는 개념을 서버 클러스터링 (Server Clustering)이라고 한다. 여러 대의 서버를 클러스터로 묶게 되면, 특정 서버에서 장애가 발생하더라도 다른 서버에서 외부의 요청을 처리할 수 있기 때문에 서비스 전체의 가용성에 문제가 발생하지 않는다는 장점이 있다.

카프카 또한 여러 대의 서버 (브로커)를 묶어 하나의 거대한 서비스 (클러스터)처럼 동작하기 때문에, 특정 서버에 장애가 발생하더라도 카프카를 이용하는 클라이언트에게는 정상적인 처리와 응답을 제공할 수 있다. 또한 클러스터 내에 카프카 서버를 추가할 때마다 그만큼 메시지의 수신과 전달에 대한 처리량이 증가하기 때문에 확장성 측면에서도 장점을 가진다.

![](https://github.com/user-attachments/assets/4af95bea-f58b-4ecc-ba96-3c1163827f27)

카프카 클러스터의 확장 작업은 시스템 전체의 사용에 영향을 주지 않으면서도 온라인 상태에서 가능하다. 이러한 특징은 카프카 클러스터를 처음 구축할 때 소규모로 운영하다가, 이후에 처리하는 트래픽 양에 따라 대규모로 늘릴 수 있다는 장점을 가진다.

#### 토픽 (Topic)과 파티션 (Partition)

카프카의 메시지는 토픽으로 분류된다. 토픽은 데이터베이스의 테이블이나 파일 시스템, 실생활에 비유하자면 하나의 고속도로와 유사하다. 하나의 토픽은 여러 개의 파티션으로 구성될 수 있다. 파티션은 비유하자면 고속도로의 하나의 차선과 유사하다.

![](https://github.com/user-attachments/assets/60a6e607-7924-4d02-ad48-f65708674eb6)

메시지는 파티션에 추가되는 형태로 기록되며, 맨 앞부터 제일 끝까지의 순서대로 읽는다. 보통 하나의 토픽은 여러 개의 파티션으로 구성되지만, 메시지의 처리 순서는 토픽이 아닌 파티션별로 관리된다.  이 때 각 파티션은 서로 다른 서버에 분산될 수 있는데, 이러한 특징으로 인해 하나의 토픽이 여러 서버에 걸쳐 수평적으로 확장될 수 있다.

#### 메시지 (Message)

카프카에서는 데이터의 기본 단위를 메시지라고 한다. 카프카는 메시지를 바이트 배열의 데이터로 간주하며 특정 형식이나 의미를 갖진 않는다. 따라서 카프카에는 어떠한 데이터 형태이든지 저장이 가능하고, 메시지를 읽어들인 후에 적절한 형태로 변환하여 사용해야 한다.

카프카의 메시지는 토픽 내의 파티션에 기록되는데, 이 때 특정 메시지를 기록할 파티션을 결정하기 위해 메시지에 담긴 키를 해시 처리하고 그 값과 일치하는 파티션에 메시지를 기록한다. 이 때 메시지의 키 값을 해시 처리하는 로직을 파티셔너 (Partitioner) 라고 한다. 파티셔너 덕분에 동일한 키 값을 가지는 메시지들은 항상 동일한 파티션에 기록된다. 만약 메시지의 키 값이 null 값으로 전달되면 카프카 내부 기본 파티셔너는 각 파티션에 저장되는 메시지 개수의 균형을 맞추기 위해 라운드 로빈 (Round-Robin) 방식으로 메시지를 기록한다.

#### 프로듀서 (Producer)와 컨슈머(Consumer)

카프카의 클라이언트는 프로듀서와 컨슈머가 존재한다.

프로듀서는 새로운 메시지를 특정 토픽에 생성한다. 이 때 프로듀서는 기본적으로 메시지가 어떤 파티션에 기록되는지는 관여하지 않는다. 만약 프로듀서가 특정한 메시지를 특정한 파티션에 기록하고 싶을 때는 메시지 키와 파티셔너를 활용한다.

컨슈머는 하나 이상의 토픽을 구독하면서 메시지가 생성된 순서로 읽는다. 컨슈머는 메시지를 읽을 때마다 파티션 단위로 오프셋을 유지하며 읽는 메시지의 위치를 알 수 있다. 오프셋의 종류는 `Commit Offset`과 `Current Offset`이 있다. `Commit Offset`은 컨슈머로부터 “여기까지 오프셋은 읽기 완료.”라는 것을 확인하는 오프셋이다. `Current Offset` 은 컨슈머가 “어디까지 메시지를 읽었는지”를 나타내는 오프셋이다. 각각의 파티션마다 오프셋이 있기 때문에 컨슈머가 읽기를 중단했다가 다시 시작하더라도 언제든지 그 다음 메시지부터 읽을 수 있게 된다.

![](https://github.com/user-attachments/assets/e9be8e72-977e-4fd2-983c-d4a87e9e6e8b)

#### 컨슈머 그룹 (Consumer Group)

카프카 컨슈머들은 컨슈머 그룹에 속하게 된다. 여러 개의 컨슈머가 같은 컨슈머 그룹에 속할 경우엔 각 컨슈머가 해당 토픽의 다른 파티션을 분담하여 메시지를 읽을 수 있다. 즉 하나의 컨슈머 그룹에 더 많은 컨슈머를 추가하면 카프카 토픽의 데이터 소비를 확장할 수 있다. 따라서 더 많은 컨슈머를 추가하는 것이 메시지 소비 성능 확장의 중요한 방법이 된다.

이 때 주의할 점은 한 토픽의 각 파티션은 하나의 컨슈머만 처리할 수 있다. 그래서 하나의 토픽 내의 파티션 개수보다 더 많은 수의 컨슈머를 추가하는 것은 의미가 없다. 또한 각 컨슈머가 특정 파티션에 대응되는 것을 파티션 소유권 (Partition Ownership)이라고 한다.

아래는 파티션의 개수와 컨슈머 개수에 따른 소비를 보여준다.

![](https://github.com/user-attachments/assets/2aff8f34-ff73-4543-8be6-68f355e8519e)

![](https://github.com/user-attachments/assets/ac6deaba-1f97-459b-83be-f515a42b99e6)

4개의 파티션에 4개의 컨슈머, 즉 파티션 개수와 컨슈머 개수가 같은 경우 최대의 읽기 성능을 보인다.

![](https://github.com/user-attachments/assets/126f52bb-60c0-494b-a94f-be300f0773c4)

4개의 파티션에 5개의 컨슈머, 파티션 개수보다 더 많은 컨슈머 구성일 경우 일하지 않는 컨슈머가 발생한다.

카프카는 하나의 토픽에 여러 개의 컨슈머 그룹이 붙어서 메시지를 읽을 수 있는 다중 컨슈머 그룹 기능을 제공한다. 이렇게 되면 여러 개의 컨슈머 그룹이 서로 간의 상호 간섭 없이 각자의 오프셋으로 각자의 순서에 맞게 메시지를 읽고 처리할 수 있다.

같은 토픽의 메시지를 읽어야 하는 여러 개의 애플리케이션이 있다면 각각의 애플리케이션마다 각자의 컨슈머 그룹을 갖게 하면 되는데, 이 때문에 보통 컨슈머 그룹명은 애플리케이션 이름과 일치시켜 관리하는 편이다.

![](https://github.com/user-attachments/assets/adae9260-c75c-4ff0-9366-2d1e032c5b6b)

#### 리밸런싱 (Rebalancing)

하나의 컨슈머로부터 다른 컨슈머로 파티션 소유권이 이전되는 것을 리밸런싱이라고 한다. 리밸런싱은 컨슈머 그룹의 가용성과 확장성을 높여주는 중요한 개념이다. 컨슈머 그룹 내의 컨슈머가 추가되면, 그에 맞게 특정 파티션의 소유권을 신규 컨슈머에게 넘겨줄 수 있어야 하고, 컨슈머 그룹 내에서 에러가 발생한 컨슈머에게는 파티션 소유권을 회수하여 다른 컨슈머에게 전달해줄 수 있어야 전반적인 메시지 소비 성능과 가용성이 유지될 수 있기 때문이다.

리밸런싱은 보통 다음과 같은 상황에서 발생한다.

1. 컨슈머 그룹 내에서 새로운 컨슈머가 추가되거나,
2. 특정 컨슈머에 문제가 생겨 중단되거나,
3. 해당 컨슈머 그룹이 바라보는 토픽 내에 새로운 파티션이 생기거나,

리밸런싱은 위의 언급처럼 컨슈머 그룹의 가용성과 확장성을 높여주기 때문에 중요하지만, 리밸런싱 동안 컨슈머들은 메시지를 읽을 수 없는 상태가 되므로 (stop the world) 안전하게 리밸런싱하는 방법과 부적절한 리밸런싱을 피하는 것이 중요하다.

#### 레플리케이션 (Replication)

레플리케이션은 카프카 클러스터의 가용성을 보장하는 개념이다.

카프카의 메시지는 토픽에 저장되며, 각 토픽은 여러 파티션으로 구성된다. 이 때 각 파티션은 다수의 복제본 (Replica)를 가질 수 있다. 레플리카는 다음 두 가지 형태가 있다.

1. **리더 레플리카** (Leader Replica) : 각 파티션은 리더로 지정된 하나의 레플리카를 가진다. 일관성을 보장하기 위해 모든 프로듀서와 컨슈머 클라이언트의 요청은 리더를 통해서 처리된다. 즉 모든 메시지의 읽기와 쓰기 요청은 리더 레플리카를 통해서만 처리된다.
2. **팔로워 레플리카** (Follower Replica) : 각 파티션의 리더를 제외한 나머지 레플리카를 팔로워라고 한다. 팔로워는 클라이언트의 요청을 서비스하지 않고, 단순히 리더의 메시지를 복제하여 리더와 동일하게 유지하는 역할을 한다. 이후 어떠한 문제로 특정 파티션의 리더가 중단되는 경우 팔로워 레플리카 중 하나가 해당 파티션의 새로운 리더로 선출된다.

![](https://github.com/user-attachments/assets/9cf1fcdb-76ee-4b51-b945-3349127db260)

리더 레플리카와 동기화하기 위해 팔로워 레플리카들은 리더에게 페치 (Fetch) 요청을 전송한다. 이는 컨슈머가 메시지를 읽기 위해 전송하는 것과 같다. 이 때 최신 메시지를 계속 요청하는 팔로워 레플리카를 `In-Sync Replica (ISR)` 라고 하고, 그렇지 않은 레플리카를 `Out-Sync Replica (OSR)` 라고 한다. 당연하게도 동기화되지 않은 레플리카는 추후 리더에 장애가 발생하여 중단되었을 때 새로운 리더로 선출될 수 없다.

#### 레플리케이션 팩터 (Replication Factor)

레플리케이션 팩터는 파티션의 복제본을 몇 개를 생성할지에 대한 설정이다. 카프카에서는 레플리케이션 팩터를 임의로 지정해 토픽을 생성할 수 있는데, 팩터 값을 2로 설정하면 리더 레플리카 1개, 팔로워 레플리카 1개씩 생성한다는 것이고, 3으로 설정하면 리더 레플리카 1개, 팔로워 레플리카 2개씩 생성한다는 의미이다.

## 카프카 Spring Boot 연동하기
### 카프카 서버 구축하기

카프카를 연동하기에 앞서 카프카 서버를 구축해야 한다. 여기서는 `docker-compose` 를 활용하여 카프카 서버를 구축했다. 카프카 서버를 구축하기 위한 `docker-compose.yml`의 내용은 다음과 같다.

```yaml
services:
  # Zookeeper 1 서비스 설정
  zookeeper1:
    image: 'bitnami/zookeeper'
    restart: always
    hostname: 'zookeeper1'
    ports:
      - '2181:2181'  # 호스트와 컨테이너 간의 포트 포워딩: 호스트의 2181 포트와 컨테이너의 2181 포트 간에 통신이 이루어짐
    environment:
      - ZOO_SERVER_ID=1  # Zookeeper 서버 ID
      # 리더 선출 및 쿼럼 통신을 위한 서버 ID, 호스트명 및 포트를 지정한 Zookeeper 앙상블 구성
      - ZOO_SERVERS=zookeeper1:2888:3888::1
      - ALLOW_ANONYMOUS_LOGIN=yes  # 익명 로그인 허용 설정
    user: root  # 컨테이너 실행 시 사용할 사용자
  # Kafka 브로커 1 서비스 설정
  kafka1:
    image: 'bitnami/kafka'
    hostname: 'kafka1'
    restart: on-failure
    ports:
      - '9092:9092'    # 호스트 포트와 컨테이너 포트 간의 포트 포워딩 설정: 호스트의 9092 포트와 컨테이너의 9092 포트 간에 통신이 이루어짐
      - '9094:9094'
    environment:
      - KAFKA_BROKER_ID=1    # Kafka 브로커 ID
      - ALLOW_PLAINTEXT_LISTENER=yes    # PLAINTEXT 리스너 허용 설정 (yes : 보안 없이 접속 가능)
      - KAFKA_ENABLE_KRAFT=no    # Kafka KRaft 활성화 여부 설정 (no : Zookeeper 사용/ yes : Zookeeper 사용x)
      - KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=PLAINTEXT:PLAINTEXT,INTERNAL:PLAINTEXT
      - KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,INTERNAL://:9094    # Kafka 브로커 리스너 설정 (Kafka 내부/외부에서 접속할 정보)
      - KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://127.0.0.1:9092,INTERNAL://kafka1:9094
      - KAFKA_CFG_ZOOKEEPER_CONNECT=zookeeper1:2181  #ZooKeeper의 주소를 KAFKA_CFG_ZOOKEEPER_CONNECT 환경 변수에 설정
      - KAFKA_CFG_INTER_BROKER_LISTENER_NAME=INTERNAL
    depends_on:
      - zookeeper1
    user: root    # 컨테이너 실행 시 사용할 사용자

  # Kafka UI 설정
  kafka-ui:
    image: provectuslabs/kafka-ui
    hostname: kafka-ui
    ports:
      #서버의 8989포트를 도커컨테이너의 8080포트와 연결
      - "8989:8080"    # 호스트 포트와 컨테이너 포트 간의 포트 포워딩 설정: 호스트의 8989 포트와 컨테이너의 8080 포트 간에 통신이 이루어짐
    restart: always    # 컨테이너 재시작 설정
    environment:
      - KAFKA_CLUSTERS_0_NAME=kafka1    # Kafka 클러스터 이름 설정
      - KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=kafka1:9094  # Kafka 클러스터 부트스트랩 서버 설정
      - KAFKA_CLUSTERS_0_ZOOKEEPER=zookeeper1:2181
```

docker-compose의 카프카 브로커 설정은 다음과 같다.

- `image`: ‘bitnami/kafka’
    - bitnami/kafka 이미지를 사용한다.
- `restart`
    - no: 컨테이너를 자동으로 재시작하지 않는다. (Default)
    - on-failure: 컨테이너가 정상적으로 종료되지 않은 경우에만 재시작한다. max-retries도 함께 설정하면 재시작 최대 시도 횟수를 지정할 수 있다.
    - always: 컨테이너가 stop 하게 되면 항상 재시작한다.
    - unless-stopped: 컨테이너를 stop 시키기 전까지 항상 재시작한다.
- `ports`
    - ‘9092:9092’ : 내부 네트워크 통신을 위한 PLAINTEXT 리스너. 카프카 클라이언트가 브로커와 통신할 때 사용된다.
    - ‘9094:9094’ : 외부 접근을 위한 EXTERNAL 리스너. 외부에서 카프카 브로커에 접근할 때 사용된다. (외부 ex: Spring …)
- `environment`
    - ALLOW_PLAINTEXT_LISTENER: 암호화되지 않은 평문 통신을 허용한다.
    - KAFKA_CFG_LISTENERS: 카프카가 수신하는 포트를 정의한다. 리스너를 설정하여 카프카 클라이언트가 브로커에 연결할 수 있는 방법을 지정한다.
    - KAFKA_CFG_ADVERTIESD_LISTENERS: 외부 클라이언트에게 접속 가능한 리스너 주소를 정의한다.
    - KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP: 각 리스너의 보안 프로토콜을 매핑한다.
    - KAFKA_CFG_ZOOKEEPER_CONNECT: zookeeper와 연결하는 주소를 정의한다.
    - KAFKA_CFG_INTER_BROKER_LISTENER_NAME: 브로커 간 통신에 사용하는 리스너를 설정한다.

위와 같이 docker-compose.yml 파일을 작성한 후, 해당 docker-compose.yml 파일이 존재하는 경로에서 아래와 같은 명령어로 실행한다.

```
$ docker-compose up -d
```

Docker Desktop 으로 확인하면 다음과 같이 Compose로 구성한 컨테이너가 실행된 것을 확인할 수 있다.

![](https://github.com/user-attachments/assets/4dc3e0d7-2454-4c56-9589-84abfbaa771e)

### 카프카 환경설정

`application.yml` 에 추가한 카프카 설정은 다음과 같다.

```yaml
spring:
  kafka:
    producer:
      bootstrap-servers: localhost:9092
      acks: all
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
    consumer:
      bootstrap-servers: localhost:9092
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
    listener:
      concurrency: 3
      poll-timeout: 10000
```

- `bootstrap-servers`: 카프카 클러스터의 연결에 사용할 호스트:포트 목록
- `acks`
    - 프로듀서가 메시지를 보내고 그 메시지를 브로커가 잘 받았는지 확인할 것, 또는 확인하지 않을 것을 결정하는 옵션
    - `acks = 0`

      ![](https://github.com/user-attachments/assets/6a004a84-25ec-4182-a248-dacaafdb4330)

        - 프로듀서는 브로커 서버로부터 어떠한 ack도 기다리지 않는다. 즉 카프카 브로커가 메시지를 잘 받았는지 보장하지 않고 클라이언트는 전송 실패에 대한 결과를 모르기 때문에 재요청 설정도 동작하지 않는다.
        - 메시지 손실 가능성이 높으나 높은 처리량을 얻을 수 있는 옵션
    - `acks = 1`

      ![](https://github.com/user-attachments/assets/49e22629-db32-48f5-95be-76bbb94c96ea)

        - 리더 레플리카가 메시지를 기록하고, ISR 팔로워가 기록한 메시지를 잘 복제했는지 확인하지 않고 ack를 응답한다. `acks = 0` 설정에 비해 메시지 손실 가능성은 낮으나 처리량은 떨어진다.
    - `acks = all or -1`

      ![](https://github.com/user-attachments/assets/fbe65aa1-fc89-4f56-9381-f7f65818bc9f)

        - 리더 레플리카가 팔로워로부터 메시지 동기화에 대한 ack를 기다린 후 ack를 응답한다.
        - 하나 이상의 팔로워가 있는 이상 메시지 손실 가능성이 없으며 가장 강력한 일관성을 얻을 수 있다.
        - 토픽의 설정에는 `min.insync.replicas` 설정이 존재하는데 이 설정은 ack 응답을 보내기 위해 리더가 동기화를 확인해야 할 최소 레플리케이션 수이다.
            - 주의할 점은 `min.insync.replicas` 수는 리더도 포함하기 때문에 `min.insync.replicas` 가 1인 경우에는 `acks = 1` 과 동일하게 동작한다.
            - 손실 없는 메시지 전송을 위해 `acks = all`로 설정했다면 `min.insync.replicas`는 2에 레플리케이션 팩터는 3으로 지정할 것을 권장한다.
                - 만약 브로커 1이 다운되어도 브로커 2가 있어서 `min.insync.replicas`를 만족할 수 있기 때문에 브로커 한 대가 다운되어도 손실 없는 메시지 전송이 가능하다.
- `key-serializer`: 메시지 키 직렬화 전략 설정 (프로듀서 설정)
    - `StringSerializer`: 문자열 타입으로 직렬화
    - `JsonSerializer`: Json (객체) 타입으로 직렬화
- `value-serializer`: 메시지 값 직렬화 전략 설정 (프로듀서 설정)
    - `StringSerializer`
    - `JsonSerializer`
- `key-deserializer`: 메시지 키 역직렬화 전략 설정 (컨슈머 설정)
    - `StringDeserilizer`: 문자열 타입으로 역직렬화
    - `JsonDeserilizer`: Json (객체) 타입으로 역직렬화
- `value-deserializer`: 메시지 값 역직렬화 전략 설정 (컨슈머 설정)
    - `StringDeserilizer`
    - `JsonDeserilizer`
- `concurrency`
    - 컨슈머의 스레수 개수를 지정하는 값
    - 컨슈머가 소비하는 토픽의 파티션 개수에 상응하는 값으로 설정하는 것이 가장 성능에 적합하다.
        - `파티션 수 > concurrency`: 하나의 컨슈머 스레드가 여러 개의 파티션을 처리
        - `파티션 수 < concurrency`: 파티션 수보다 많은 컨슈머 스레드는 아무런 동작을 하지 않는다.
        - `파티션 수 = concurrency`: 하나의 컨슈머 스레드가 하나의 파티션을 처리하여 최적의 상태이다.
- `poll-timeout`: 컨슈머가 한 번에 폴링, 즉 메시지를 처리할 수 있는 최대 시간 (ms)

Spring Boot 서비스에 카프카 프로듀서 및 컨슈머를 연동하기 위한 `KafkaConfig` 빈 설정은 다음과 같다.

```kotlin
@EnableKafka
@Configuration
class KafkaConfig {
    @Value("\${spring.kafka.producer.bootstrap-servers}")
    lateinit var producerBootstrapServers: String

    @Value("\${spring.kafka.producer.acks}")
    lateinit var acks: String

    @Value("\${spring.kafka.producer.key-serializer}")
    lateinit var keySerializer: String

    @Value("\${spring.kafka.producer.value-serializer}")
    lateinit var valueSerializer: String

    @Value("\${spring.kafka.consumer.bootstrap-servers}")
    lateinit var consumerBootstrapServers: String

    @Value("\${spring.kafka.consumer.key-deserializer}")
    lateinit var keyDeserializer: String

    @Value("\${spring.kafka.consumer.value-deserializer}")
    lateinit var valueDeserializer: String

    @Value("\${spring.kafka.consumer.group-id}")
    lateinit var groupId: String

    @Value("\${spring.kafka.listener.concurrency}")
    lateinit var concurrency: String

    @Value("\${spring.kafka.listener.poll-timeout}")
    lateinit var pollTimeout: String

    @Bean
    fun producerProps(): Map<String, Any> {
        val props = hashMapOf<String, Any>()
        props[ProducerConfig.BOOTSTRAP_SERVERS_CONFIG] = producerBootstrapServers
        props[ProducerConfig.ACKS_CONFIG] = acks
        props[ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG] = keySerializer
        props[ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG] = valueSerializer
        return props
    }

    @Bean
    fun producerFactory(): ProducerFactory<String, Any> {
        return DefaultKafkaProducerFactory<String, Any>(producerProps())
    }

    @Bean
    fun kafkaTemplate(): KafkaTemplate<String, Any> {
        return KafkaTemplate<String, Any>(producerFactory())
    }

    @Bean
    fun consumerProps(): Map<String, Any> {
        val props = hashMapOf<String, Any>()
        props[ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG] = consumerBootstrapServers
        props[ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG] = keyDeserializer
        props[ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG] = valueDeserializer
        props[ConsumerConfig.GROUP_ID_CONFIG] = groupId
        props[JsonDeserializer.TRUSTED_PACKAGES] = "*"
        return props
    }

    @Bean
    fun consumerFactory(): ConsumerFactory<Int, Any> {
        return DefaultKafkaConsumerFactory<Int, Any>(consumerProps())
    }

    @Bean
    fun kafkaListenerContainerFactory(): KafkaListenerContainerFactory<ConcurrentMessageListenerContainer<Int, Any>> {
        val factory = ConcurrentKafkaListenerContainerFactory<Int, Any>()
        factory.consumerFactory = consumerFactory()
        factory.setConcurrency(concurrency.toInt())
        factory.containerProperties.pollTimeout = pollTimeout.toLong()
        return factory
    }
}
```

**설정 유의할 점**
- 컨슈머 설정
    - `JsonDeserializer.TRUSTED_PACKAGES` : 컨슈밍하는 메시지 데이터의 역직렬화 과정에서 Json 역직렬화 시 패키지 명까지 포함하기 때문에 신뢰할 수 있는 패키지인지에 대한 설정이 필요하다.
- 리스너 설정
    - **`MessageListenerContainer`**
        - Spring Kafka 에서는 `MessageListenerContainer` 인터페이스로 컨슈머를 구성하며 실제 동작은 `MessageListener`  구현체를 `MessageListenerContainer` 설정에 제공하거나, 컨슈밍과 관련된 메서드에 `@KafkaListener`  어노테이션을 붙여 구현한다.
        - Spring Kafka 에서는 2개의 `MessageListenerContainer`  구현체를 제공한다.
            - `KafkaMessageListenerContainer`
                - 싱글 스레드에서 동작하는 컨슈머
            - `ConcurrentMessageListenerContainer`
                - 하나 이상의 `KafkaMessageListenerContainer`  인스턴스로 구성되는 멀티 스레드 방식의 컨슈머


### 카프카 프로듀서, 컨슈머 구현하기
#### 프로듀서

프로듀서의 구성은 다음과 같다.

`MessageProducer` 인터페이스로 추상화하였고, `KafkaProducer` 구현체에서 `KafkaConfig`에서 빈 등록한 `KafkaTemplate`를 통해 실제 카프카 브로커로 토픽에 메시지를 발행한다.

```kotlin
interface MessageProducer {
    fun sendProductOrderMessage(message: ProductMessage)

    fun sendAfterPaymentMessage(message: PaymentDataMessage)
}
```
```kotlin
@Component
class KafkaProducer(
    private val kafkaTemplate: KafkaTemplate<String, Any>
) : MessageProducer {
    override fun sendProductOrderMessage(message: ProductMessage) {
        kafkaTemplate.send(PRODUCT_ORDER_TOPIC, message.productDetailId.toString(), message)
    }

    override fun sendAfterPaymentMessage(message: PaymentDataMessage) {
        kafkaTemplate.send(AFTER_PAYMENT_TOPIC, message.userId.toString(), message)
    }
}
```

토픽의 경우에는 `MessageTopic.kt`라는 코틀린 파일에 상수로 관리하고자 했다.

```kotlin
const val PRODUCT_ORDER_TOPIC = "queue.product.order"
const val AFTER_PAYMENT_TOPIC = "queue.after.payment"
```

#### 컨슈머

컨슈머의 구성은 다음과 같다.

컨슈머는 두 가지 그룹으로 나눈다. 이커머스 시나리오 비즈니스 로직용 그룹인 `hhplus_ecommerce` (application.yml 설정으로 관리) 와 Outbox 상태 관리용 그룹인 `outbox_group`이다.

```kotlin
@Component
class EcommerceKafkaConsumer(
    private val productService: ProductService
) {
    @KafkaListener(groupId = "\${spring.kafka.consumer.group-id}", topics = [PRODUCT_ORDER_TOPIC])
    fun listenProductOrderEvent(@Payload message: ProductMessage) {
        productService.updateProductQuantityDecrease(message.productDetailId, message.orderQuantity)
    }

    @KafkaListener(groupId = "\${spring.kafka.consumer.group-id}", topics = [AFTER_PAYMENT_TOPIC])
    fun listenAfterPaymentEvent(@Payload message: PaymentDataMessage) {
        val dataPlatform = ExternalDataPlatform()
        dataPlatform.sendPaymentData(message.orderId, message.currentBalance, message.paymentDate)
    }
}
```
```kotlin
@Component
class OutboxKafkaConsumer(
    private val paymentEventOutboxService: PaymentEventOutboxService
) {
    private val logger = KotlinLogging.logger {}

    /**
     * OUTBOX COMPLETE 상태 업데이트용 컨슈머
     */
    @KafkaListener(groupId = "outbox_group", topics = [AFTER_PAYMENT_TOPIC])
    fun listenPaymentDataPlatformEvent(@Payload message: PaymentDataMessage) {
        logger.info("OUTBOX CONSUMER GROUP: After Payment Topic - userId: {}, orderId: {}", message.userId, message.orderId)
        paymentEventOutboxService.updateEventStatusComplete(
            PaymentEventOutboxRequestDto(message.userId, message.orderId)
        )
    }
}
```

### 카프카 연동 확인하기

kafka-ui 로 접속하여 (localhost:8989) 토픽을 생성한다. 본 예제에서는 상품 주문 토픽을 나타낸다.

![](https://github.com/user-attachments/assets/3e1d07d7-47a1-4166-b3ba-4d001a00fa74)

* **토픽 설정**
    * 파티션: 3개
    * `min.insync.replicas`: 2
    * 레플리케이션 팩터: 3

`acks = all` 로 설정해줬기 때문에 위와 같이 `min.insync.replicas`를 2, 레플리케이션 팩터를 3으로 설정해줬다. (주의할 점은 레플리케이션 팩터를 3으로 설정해주기 위해선 카프카 브로커 또한 3개가 존재해야 한다. 본 예제에서는 임의로 팩터가 3개라고 칭하도록 하겠다.)

토픽 생성 후 애플리케이션을 실행하고, 해당 토픽 메시지를 발행하는 API를 호출해준다. 컨슈머가 정상적으로 애플리케이션에 연동되었다면 실행할 때 다음과 같은 콘솔 로그를 볼 수 있다.

![](https://github.com/user-attachments/assets/8e1d09be-65b4-4f7b-86b4-7c276e207f84)

토픽의 메시지가 잘 발행되었는지 확인하기 위해 kafka-ui에 접속해 해당 토픽의 메시지를 확인한다.

![](https://github.com/user-attachments/assets/19304d1c-92a4-481e-a948-ddb5d5d0111d)

## 카프카 이벤트 결과적 일관성 보장

카프카의 메시지 발행 결과의 일관성 및 신뢰성을 보장하기 위한 전략을 설계 및 구현해본다.

### Transactional Outbox Pattern 설계 및 구현

Transactional Outbox Pattern은 우리가 개발하는 서비스에서 DB를 업데이트하는 트랜잭션과 메시지를 함께 발행할 때, DB 업데이트 작업과 메시지 발행 작업이 원자적으로 수행되지 않는 문제를 해결하기 위한 전략이다.

방법은 DB를 업데이트하는 트랜잭션에서 메시지를 DB에 저장한다. 그런 다음 별도의 프로세스가 저장된 이벤트를 읽어 메시지 브로커에 전송한다. 만약 이벤트 처리 실패 시 다시 시도할 수 있어서 Transactional Outbox Pattern은 적어도 한 번 이상 (at-least once) 메시지가 성공적으로 전송되었는지 확인할 수 있는 방법이다.

다음은 이커머스 시나리오의 결제 로직에 대해 Transactional Outbox Pattern을 적용한 설계 및 구현한 내용이다. 참고로 결제 로직에서는 결제 동작이 완료된 후 외부 데이터 플랫폼으로 데이터를 전송하는 이벤트를 발행한다.

#### 설계

![](https://github.com/user-attachments/assets/6976215b-1962-4639-b1c1-10389511d359)

```
┌───────────────────────────────────────────────────────────┐
│ 1. 결제 요청                                               │
│ Tx 1 생성                                                 │
│ 2. 결제 비즈니스 로직 수행                                 │
│ 3. BEFORE_COMMIT 이벤트                                   │
│    - Outbox 테이블에 INIT 상태인 메시지 저장                │
│ Tx 1 커밋                                                 │
│ 4. AFTER_COMMIT 이벤트                                    │
│    - Outbox 테이블에서 해당 메시지 상태 PUBLISH로 업데이트  │
│    - 메시지 브로커에게 메시지 발행 요청                     │
└───────────────────────────────────────────────────────────┘
 - 결제 완료 메시지 Producing
┌───────────────────────────────────────────────────────────┐
│ Consumer (ecommerce group)                                │
│ - 외부 데이터 플랫폼 전송                                   │
└───────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────┐
│ Consumer (outbox group)                                   │
│ - Outbox 테이블에서 해당 메시지 상태 COMPLETE로 업데이트     │
└───────────────────────────────────────────────────────────┘
```

#### 구현

1️⃣ 결제 로직 BEFORE_COMMIT 이벤트

```kotlin
@Component
class PaymentEventListener(
    private val paymentEventOutboxService: PaymentEventOutboxService
) {
    /**
     * 결제 트랜잭션 커밋 전 이벤트 발행
     * outbox 테이블에 INIT 상태인 데이터 저장
     */
    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    fun listenBeforePaymentEvent(event: BeforePaymentEvent) {
        paymentEventOutboxService.save(
            PaymentEventOutboxDto(
                0L,
                event.paymentEventRequest.userId,
                event.paymentEventRequest.orderId,
                OutboxEventStatus.INIT,
                LocalDateTime.now()
            )
        )
    }
}
```

2️⃣ 결제 로직 AFTER_COMMIT 이벤트

```kotlin
@Component
class PaymentEventListener(
    private val paymentEventOutboxService: PaymentEventOutboxService,
    private val messageProducer: MessageProducer
) {
    /**
     * 결제 트랜잭션 커밋 후 이벤트 발행
     * outbox 테이블 PUBLISH 상태 업데이트 및 Kafka 메시지 발행
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    fun listenAfterPaymentEvent(event: AfterPaymentEvent) {
        paymentEventOutboxService.updateEventStatusPublish(
            PaymentEventOutboxRequestDto(
                event.paymentEventInfo.userId,
                event.paymentEventInfo.orderId
            )
        )
        // 결제 완료 메시지 발행
                messageProducer.sendAfterPaymentMessage(PaymentDataMessage.from(event.paymentEventInfo))
    }
}
```

3️⃣ Kafka Producer

```kotlin
interface MessageProducer {
    fun sendAfterPaymentMessage(message: PaymentDataMessage)
}
```

```kotlin
@Component
class KafkaProducer(
    private val kafkaTemplate: KafkaTemplate<String, Any>
) : MessageProducer {
        override fun sendAfterPaymentMessage(message: PaymentDataMessage) {
                kafkaTemplate.send(AFTER_PAYMENT_TOPIC, message.userId.toString(), message)
        }
}
```

참고로 토픽은 코틀린 파일에서 상수로 관리하고 있다.

```kotlin
const val AFTER_PAYMENT_TOPIC = "queue.after.payment"
```

4️⃣ Kafka Consumer (ecommerce group)

```kotlin
@Component
class EcommerceKafkaConsumer(
    private val productService: ProductService
) {
        @KafkaListener(groupId = "\${spring.kafka.consumer.group-id}", topics = [AFTER_PAYMENT_TOPIC])
        fun listenAfterPaymentEvent(@Payload message: PaymentDataMessage) {
            val dataPlatform = ExternalDataPlatform()
            dataPlatform.sendPaymentData(message.orderId, message.currentBalance, message.paymentDate)
        }
}
```

5️⃣ Kafka Consumer (outbox group)

```kotlin
@Component
class OutboxKafkaConsumer(
    private val paymentEventOutboxService: PaymentEventOutboxService
) {
        private val logger = KotlinLogging.logger {}
    
        /**
         * OUTBOX COMPLETE 상태 업데이트용 컨슈머
         */
        @KafkaListener(groupId = "outbox_group", topics = [AFTER_PAYMENT_TOPIC])
        fun listenPaymentDataPlatformEvent(@Payload message: PaymentDataMessage) {
            logger.info("OUTBOX CONSUMER GROUP: After Payment Topic - userId: {}, orderId: {}", message.userId, message.orderId)
            paymentEventOutboxService.updateEventStatusComplete(
                    PaymentEventOutboxRequestDto(
                          message.userId, 
                          message.orderId
                    )
              )
        }
}
```

### 실패 케이스 재시도 스케줄러 설계 및 구현

만약 메시지 발행이 실패하거나 발행한 메시지를 소비 동작이 정상적으로 수행되지 않을 경우엔 Outbox 테이블에 저장된 메시지 상태가 아무리 시간이 지나도 COMPLETE 로 업데이트되지 않을 것이다. 즉 **Outbox 테이블에 저장된 지 일정 시간이 지난 후에도 상태가 업데이트되지 않는** 메시지를 대상으로 메시지 발행을 재시도하는 스케줄러를 통해 실패 케이스에 대해 재시도를 수행하며 데이터의 일관성을 보장한다.

#### 설계
##### 실패 케이스 1. INIT (최초 등록) 인 상태에서 지연

![](https://github.com/user-attachments/assets/61b82323-06e1-4716-83e1-869c6376d2e2)

Outbox 메시지 상태가 INIT (최초 등록) 인 상태에서 테이블에 저장된 지 5분이 경과된 경우에, 해당 메시지 상태를 PUBLISH로 업데이트함과 동시에 해당 메시지를 메시지 브로커에 발행 요청한다.

여기서 5분이라는 시간은 컨슈머가 정상적으로 동작 중이지만, 앞의 메시지들을 처리하느라 해당 메시지를 아직 소비하지 못하는 경우에 바로 처리가 어려울 수 있다. 이 경우를 대비하여 정상적인 메시지 소비에 대한 보장 시간이다.

##### 실패 케이스 2. PUBLISH (메시지 발행) 인 상태에서 지연

![](https://github.com/user-attachments/assets/350a47b0-875c-4754-8aae-82eefbf07808)

Outbox 메시지 상태가 PUBLISH (발행) 인 상태에서 테이블에 저장된 지 5분이 경과된 경우에, 해당 메시지를 메시지 브로커에 발행 요청한다.

#### 구현

결제 이벤트에 대한 스케줄러는 다음과 같이 구현했다.

```kotlin
@Component
class PaymentEventScheduler(
    private val paymentEventOutboxService: PaymentEventOutboxService,
    private val balanceService: BalanceService,
    private val messageProducer: MessageProducer
) {
    /**
     * 매 5분마다 INIT 상태인 이벤트 재시도
     */
    @Scheduled(cron = "0 */5 * * * *")
    fun retryPaymentEventInitStatus() {
        val initEventOutboxes = paymentEventOutboxService.getAllByEventStatus(OutboxEventStatus.INIT)
            .filter { it.createdDate < LocalDateTime.now().minusMinutes(5) }   // 메시지가 정상적으로 발행되고 소비될 때까지 보장 시간 5분

        initEventOutboxes.forEach {
            val currentBalance = balanceService.getByUserId(it.userId).amount

            paymentEventOutboxService.updateEventStatusPublish(
                PaymentEventOutboxRequestDto(it.userId, it.orderId)
            )

            messageProducer.sendAfterPaymentMessage(
                PaymentDataMessage(it.userId, it.orderId, currentBalance, it.createdDate)
            )
        }
    }

    /**
     * 매 5분마다 PUBLISH 상태인 이벤트 재시도
     */
    @Scheduled(cron = "0 */5 * * * *")
    fun retryPaymentEventPublishStatus() {
        val publishEventOutboxes = paymentEventOutboxService.getAllByEventStatus(OutboxEventStatus.PUBLISH)
            .filter { it.createdDate < LocalDateTime.now().minusMinutes(5) }

        publishEventOutboxes.forEach {
            val currentBalance = balanceService.getByUserId(it.userId).amount

            messageProducer.sendAfterPaymentMessage(
                PaymentDataMessage(it.userId, it.orderId, currentBalance, it.createdDate)
            )
        }
    }
}
```

## 카프카 이벤트 통합테스트

카프카의 프로듀서가 메시지를 발행하고, 컨슈머가 메시지를 소비하는 이러한 작업들을 테스트하기 위해 여러 방법이 있지만, 여기서는 `spring-kafka-test`의 `@EmbeddedKafka` 를 사용하는 방법을 소개한다.

`@EmbeddedKafka` 는 Spring Boot 애플리케이션이 외부 카프카 서버에 의존하지 않는 안정적이고 독립적으로 카프카 통합 테스트를 진행하도록 도와주는 기능이다.

사용하기 위해서는 먼저 `spring-kafka-test` 의존을 추가한다.

```yaml
dependencies {
    testImplementation 'org.springframework.kafka:spring-kafka-test'
}
```

`spring-kafka-test` 의존을 추가하면 `org.springframework.kafka.test.context.EmbeddedKafka` 를 사용할 수 있게 된다. 카프카 통합 테스트를 진행할 테스트 클래스에 `@EmbeddedKafka`  어노테이션을 추가하고, 속성으로 파티션, 리스너 브로커 설정, 포트와 같은 값들을 설정해준다.

```kotlin
@SpringBootTest
@EmbeddedKafka(partitions = 3, brokerProperties = ["listeners=PLAINTEXT://localhost:9092"], ports = [9092])
class PaymentFacadeIntegrationTest {
    @Autowired private lateinit var paymentFacade: PaymentFacade
    @Autowired private lateinit var paymentEventOutboxService: PaymentEventOutboxService
    @Autowired private lateinit var orderRepository: OrderRepository
    @Autowired private lateinit var balanceRepository: BalanceRepository
    @Autowired private lateinit var paymentEventOutboxRepository: PaymentEventOutboxRepository
    
    @Test    
    @DisplayName("결제 요청 정상 처리 후 outbox 메시지 상태가 COMPLETE 인지 확인한다")
    fun outboxStatusUpdateCompleteAfterPayment() {
        val userId = 1L
        val orderId = orderRepository.save(OrderTable(userId, LocalDateTime.now(), 10000, OrderStatus.ORDER_COMPLETE)).id)
        balanceRepository.save(Balance(userId, 10000))
        
        paymentFacade.orderPayment(userId, orderId)
        
        // 메시지 컨슈밍까지 완료 보장시간 2초
        Thread.sleep(2000)
        
        val actual = paymentEventOutboxRepository.getByUserIdAndOrderId(userId, orderId)
        
        assertThat(actual.eventStatus).isEqualTo(OutboxEventStatus.COMPLETE)
    }
}
```

테스트 코드를 수행해보면 다음과 같이 `OutboxKafkaConsumer` 에서 메시지를 소비할 때 남긴 로그와 PaymentEventOutbox 테이블에 저장된 메시지 데이터를 업데이트하는 쿼리가 수행되는 것을 볼 수 있다.

![](https://github.com/user-attachments/assets/9de7123a-de26-4c16-abc1-aec4695b0593)
