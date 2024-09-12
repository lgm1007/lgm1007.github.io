---
layout:	post
title: Spring Boot에서 Redis 실습하기
date: 2024-09-02 13:03:31 +0900
image: technology-10.jpg
author: GyuMyung
tags: technology
comments: true
---

### Redis를 사용하는 이유
Redis는 오픈 소스 기반의 고성능 키-값 저장소로, 메모리 내 데이터 저장 및 검색을 위한 데이터베이로 사용한다. redis는 메모리 내 데이터 저장으로 빠른 응답 속도를 제공하며 문자열, 리스트, 집합, 해시와 같은 다양한 데이터 타입을 다룰 수 있어 다양한 애플리케이션에서 활용 가능하다. <br/><br/>
Redis는 디스크에 데이터를 주기적으로 저장하여 데이터의 지속성을 제공한다. 이를 통해 시스템 장애 시 데이터 손실에 대해서도 방지할 수 있다. <br/><br/>

#### Redis 실제 활용 사례
1. `캐싱(Cashing)`: 임시 비밀번호(One-Time Password; OTP), 로그인 세션, JWT, 일정 주기로 갱신해도 괜찮은 데이터, 동일한 연산으로 나온 결과
2. `실시간 분석`: 순위, 실시간 이벤트 로그 처리, 방문자 수 계산
3. `Pub/Sub 패턴`: 실시간 채팅, 이벤트 메시징 처리
4. `큐`: 우선순위 큐, 이메일 전송

### 실습 환경 구성
* Windows
* Docker
* Spring Boot 2.7.8
* Kotlin 1.9.25

실습 소스코드 Git Repository: [redis-practice git repository](https://github.com/lgm1007/redis-practice)

### Docker redis 컨테이너 실행
우선 실습하기 앞서 **Docker** 설치가 선행되어야 한다. <br/>
Docker hub에서 redis 이미지를 받아온다. <br/>
```
> docker pull redis
```

받아온 redis 이미지를 실행시킨다. 이 때 `-d` 옵션으로 백그라운드에서 컨테이너를 실행시키도록 하고 컨테이너 id를 지정해준다. <br/>
```
> docker run -p 6379:6379 --name redis -d redis
```

### redis 의존성 추가
Spring boot에 redis의 의존성을 추가해준다. `spring-boot-starter-data-redis` 라이브러리를 추가해준다. <br/>

* maven 설정

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

* gradle 설정

```gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-data-redis'
}
```

### redis 설정 정보
redis를 사용할 설정 정보를 추가해준다. 해당 예제에서는 `application.yml` 파일에 다음과 같이 설정 정보를 추가했다. <br/>
```yml
spring:
  redis:
    host: localhost
    port: 6379
```

### redis 설정 정보 추가
#### RedisConnectionFactory
redis의 dataSource를 빈으로 등록해주기 위한 Configuration을 추가해준다. <br/>
```kotlin
class RedisConfig {
    @Value("\${spring.redis.host}")
    private lateinit var redisHost: String

    @Value("\${spring.redis.port}")
    private lateinit var redisPort: String

    @Bean
    fun redisConnectionFactory(): RedisConnectionFactory {
        val redisStandaloneConfiguration = RedisStandaloneConfiguration()
        redisStandaloneConfiguration.hostName = redisHost
        redisStandaloneConfiguration.port = redisPort.toInt()
        return LettuceConnectionFactory(redisStandaloneConfiguration)
    }
}
```

### redis 객체 저장 기능 구현 및 테스트
#### Entity
redis에서는 id를 String으로 사용한다고 한다. 또한 `@RedisHash`로 데이터의 key값을 정의해준다. <br/>
```kotlin
@RedisHash("Boards")
class Board(
    var title: String,
    var author: String,
) {
    @Id var id: String? = null
        private set
}
```

#### Repository
```kotlin
interface BoardRepository : CrudRepository<Board, String> {
}
```

#### Service
```kotlin
interface BoardCommand {
    fun save(board: Board): String?
}
```
```kotlin
@Service
@RequiredArgsConstructor
class BoardService(
    private val boardRepository: BoardRepository,
) : BoardCommand {

    override fun save(board: Board): String? {
        return boardRepository.save(board).id
    }
}
```

#### Test
redis에 데이터가 저장되었는지 확인하는 통합테스트를 작성한다. <br/>
```kotlin
@SpringBootTest
class BoardServiceTest(
    @Autowired var boardService: BoardService,
    @Autowired var boardRepository: BoardRepository,
) {

    @BeforeEach
    fun setUp() {
        boardRepository.deleteAll()
    }

    @Test
    fun redis_save() {
        val board = createBoard()
        val actual = boardService.save(board)
        assertThat(actual).isNotEmpty()
    }

    private fun createBoard(): Board {
        return Board(title = "게시글", author = "홍길동")
    }
}
```

