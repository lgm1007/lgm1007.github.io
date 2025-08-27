---
layout:	post
title: AWS ElastiCache로 Redis 대체하기
date: 2025-08-27 16:11:27 +0900
sitemap: 
image: technology-22.png
author: GyuMyung
tags: technology
comments: true
---

## AWS ElastiCache
캐싱 목적이나, 분산락, Pub/Sub 기능을 위해 Redis를 많이 사용하곤 한다. 그런데 다중 서버 환경에서 Redis를 사용해야 한다면 어떻게 설계해야 할까? 아마 EC2 같은 하나의 서버를 다중 서버 네트워크 망에서 개설하고, 해당 서버에서 Redis를 띄울 것이다.

물론 위와 같은 방법으로도 충분히 다중 서버 환경에서 Redis를 사용하는 데 문제는 없다. 하지만 관리 측면에서 볼 때 불편한 점은 있다. 서버에서 장애가 발생했을 때 복구 조치를 하는 부분에서도 그렇고, Redis 모니터링할 때도 그렇고 살짝 불편하게 느낄만 한 부분들이 있다.

만약 AWS 기반의 서비스를 사용하고 있다면 AWS ElastiCache 서비스를 사용하길 추천한다. 관리 측면에서 훨씬 뛰어나며 Redis 기능과 100% 호환되어 사용하는 데 큰 어려움이 없다. 이번 포스팅에서는 AWS ElastiCache를 세팅하고 Spring Boot 프로젝트에서 사용하기 위해 설정하는 방법에 대해 다뤄보겠다.

### AWS ElastiCache 환경 생성
먼저 AWS ElastiCache 콘솔에 접속해서 캐시 생성을 해보자.<br>
여기서는 Redis 환경을 구성할 것이기 때문에 엔진으로 `Redis OSS`를 선택한다.

![engine](https://i.imgur.com/1A7aKTf.png)

배포 옵션은 여러 설정들을 직접 선택해주기 위해 `자체 캐시 설계`로 선택해준다. 생성 방법은 `클러스터 캐시`, 클러스터 모드는 운영 환경이라면 활성화, 개발 환경이라면 비활성화를 추천한다.

![cluster-mode](https://i.imgur.com/zmIz0xb.png)

다음으로 캐시 설정이다. 포트 번호는 Redis에서 디폴트로 사용하는 6379 포트로 설정해주고, 노드 유형은 개발 환경이라면 가장 작은 자원 사이즈인 t3.micro를 추천한다. 샤드 수 또한 개발 환경이라면 1개로 설정한다.

![cache-configuration](https://i.imgur.com/kwhRrzb.png)

연결 설정에서는 Redis를 사용할 애플리케이션이 띄워진 VPC 환경에서 ElastiCache를 띄워줘야 하기 때문에 기존 서브넷 그룹 선택하고, 띄워 줄 VPC에 대한 서브넷 그룹을 생성하여 지정해준다.

![connect](https://i.imgur.com/BFLilj5.png)

나머지 설정들은 기본값으로 설정해주는데, 가장 중요한 부분은 바로 보안 그룹 설정이다.<br>
보안 그룹을 생성하고, 인바운드 규칙에 생성해 준 서브넷 그룹의 대상인 VPC에 해당하는 CIDR 주소들에 대해 6379 포트의 TCP 연결을 허용해줘야 한다.

![security-group](https://i.imgur.com/Nzrtz2D.png)

이렇게 보안 그룹까지 설정해줬다면 ElastiCache 생성 완료다.

### ElastiCache 연결 확인
ElastiCache를 생성해 준 VPC 환경에 올라가 있는 EC2 서버에 접속해 ElastiCache가 정상적으로 연결되는지 확인할 수 있다.<br>
먼저 SSH로 EC2 서버에 접속한다. 그 후 Redis를 설치하고 `redis-cli`를 통해 연결 확인을 해볼 수 있을텐데, 우선 Redis 설치하는 부분에 대해 알아보자.

#### Linux 기반 환경이라면
```bash
sudo yum update -y
# redis-cli 버전 6 이상부터 tls 연결 가능
sudo amazon-linux-extras enable redis6
sudo yum install -y redis
```

#### Ubuntu / Debian 기반 환경이라면
```bash
sudo apt-get update
sudo apt-get install -y redis-tools
```

Redis 설치가 완료되었다면 `redis-cli`로 연결을 시도해볼 수 있다.

```bash
redis-cli -h <ElastiCache 기본 엔드포인트 주소> -p 6379 --tls
```

연결에 성공한다면 다음과 같이 Redis 접속이 될 것이다.

```bash
Elastic-기본-엔드포인트-주소:6379> 
```

만약 Connection Time out 과 같은 에러가 발생하면서 연결이 되지 않는다면 보안 그룹의 인바운드 규칙이 정상적으로 설정되지 않았거나, EC2와 ElastiCache가 같은 VPC, 서브넷 그룹 안에 없는지 확인해봐야 한다.

### Spring Boot 프로젝트에서 어떻게 ElastiCache를 연결할까?
Spring Boot에서 Redis를 사용하는 것처럼 동일하게 설정해서 사용해주면 된다.<br>
먼저 redis 의존성을 추가해준다.

```gradle
implementation("org.springframework.boot:spring-boot-starter-data-redis")
```

그리고 `application.yml` 설정 파일에서 host, port, 그리고 ssl 사용 유무 값을 추가해준다.

```yml
spring:
  data:  
    redis:  
      host: <example>.cache.amazonaws.com # AWS ElastiCache 기본 엔드포인트
      port: 6379
      ssl: true
```

그 다음 `RedisConfig` Configuration 빈을 등록해준다. 예제 코드는 코틀린으로 작성했다.

```kotlin
@Configuration  
class RedisConfig(  
    @Value("\${spring.data.redis.host}") private val host: String,  
    @Value("\${spring.data.redis.port}") private val port: Int,  
    @Value("\${spring.data.redis.ssl}") private val useSsl: Boolean  
) {
    @Bean  
    fun redisConnectionFactory(): RedisConnectionFactory {  
        val redisConfiguration = RedisStandaloneConfiguration(host, port)  
      
        val clientConfigBuilder = LettuceClientConfiguration.builder()  
        // AWS ElastiCache 전송 중 암호화 (TLS/SSL) 사용 시 설정  
        if (useSsl) {  
            clientConfigBuilder.useSsl()  
        }  
      
        return LettuceConnectionFactory(redisConfiguration, clientConfigBuilder.build())
    }
}
```

설정이나 예제 코드를 보면 알겠지만 Redis를 사용해주는 방식과 동일한 것을 볼 수 있다. 한 가지 눈여겨볼 점은 ElastiCache에서 전송 중 암호화 설정을 했다면 꼭 `.useSsl()` 설정을 해줘야한다는 점이다.

