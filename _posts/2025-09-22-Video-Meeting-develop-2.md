---
layout:	post
title: 화상통화 서비스 구현하기 (2) - 구현
date: 2025-09-22 19:00:15 +0900
sitemap: 
image: AWS-chime-sdk.png
author: GyuMyung
tags: technology
comments: true
---
화상통화 서비스 중 화상통화방 참여 기능을 한번 구현해보자.

### 기술 스택
예제에서 활용한 기술 스택 기준

- 백엔드: Kotlin + Spring Boot
  - Spring Boot v3.0.6
  - Kotlin v1.8.21
  - Java v17
- 프론트엔드: React
  - Node v18.20.8
  - Vite v6.3.6

### 백엔드 파트
#### 1. AWS Chime SDK 환경설정 구성
Gradle 설정 예제
```kotlin
dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("software.amazon.awssdk:chimesdkmeetings:2.33.1")
}
```

Spring Boot 설정<br>
application-local.yml, 설정 Bean 등록

```yml
spring:
  profiles: local

aws:
  region: ap-northeast-2
  credentials:
    access-key: YOUR_ACCESS_KEY
    secret-key: YOUR_SECRET_KEY
```

```kotlin
@Configuration
class AwsConfig(
    @Value("\${aws.credentials.access-key}") private val accessKey: String,
    @Value("\${aws.credentials.secret-key}") private val secretKey: String,
    @Value("\${aws.region}") private val region: String
) {
    @Bean
    fun chimeSdkMeetingsClient(): ChimeSdkMeetingsClient {
        val credentials = AwsBasicCredentials.create(accessKey, secretKey)
        
        return ChimeSdkMeetingsClient.builder()
            .region(Region.of(region))
            .credentialsProvider(StaticCredentialsProvider.create(credentials))
            .build()
    }
}
```

React 프론트엔드 간 CORS 에러 방지를 위한 WebMvcConfigurer 설정
```kotlin
@Configuration
class WebConfig {
    @Bean
    fun corsConfigurer(): WebMvcConfigurer {
        return object : WebMvcConfigurer {
            override fun addCorsMappings(registry: CorsRegistry) {
                registry.addMapping("/**")
                    .allowedOrigins("http://localhost:3000") // React dev server 주소
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("*")
            }
        }
    }
}
```

#### 2. AWS Chime SDK를 활용한 화상통화방 참여 API 구현
화상통화의 미팅 및 참석자 정보 DTO 구성
```kotlin
data class MeetingDto(
    val meetingId: String,
    val externalMeetingId: String,
    val mediaPlacement: MediaPlacementDto,
    val mediaRegion: String
)

data class MediaPlacementDto(
    val audioHostUrl: String,
    val audioFallbackUrl: String,
    val screenDataUrl: String,
    val screenSharingUrl: String,
    val screenViewingUrl: String,
    val signalingUrl: String,
    val turnControlUrl: String
)

data class AttendeeDto(
    val attendeeId: String,
    val externalUserId: String,
    val joinToken: String
)
```

AWS Chime SDK를 활용한 화상통화 미팅 참여 기능<br>
간단하게 구현하려면 Redis 대신 Map과 같은 메모리 자료구조로 사용하면 된다.
```kotlin
@Service
class MeetingService(
    private val client: ChimeSdkMeetingsClient,
    private val redisTemplate: RedisTemplate<String, Any>, // 생성된 통화방 별 미팅 관리를 위한 Redis 저장소
    @Value("\${aws.region}") private val region: String
) {
    private val MEETING_CACHE_PREFIX = "meeting:room:"
    
    fun joinMeeting(roomId: String, externalUserId: String): Map<String, Any> {
        val redisKey = MEETING_CACHE_PREFIX + roomId
        
        // Redis에서 Meeting 조회
        var meeting = redisTemplate.opsForValue().get(redisKey) as? Meeting
        
        if (meeting == null) {
            // 새 Meeting 생성
            val createMeetingReq = CreateMeetingRequest.builder()
                .clientRequestToken(roomId)
                .mediaRegion(region)
                .externalMeetingId(roomId.take(64))
                .build
                
            meeting = client.createMeeting(createMeetingReq).meeting()
            
            // Redis TTL 2시간으로 설정 (원하는 값으로 조절할 것)
            redisTemplate.opsForValue().set(redisKey, meeting, 2, TimeUnit.HOURS)
        }
        
        val attendee = client.createAttendee(
            CreateAttendeeRequest.builder()
                .meetingId(meeting.meetingId())
                .externalUserId(externalUserId)
                .build()
        )
        
        val meetingDto = MeetingDto(
            meetingId = meeting.meetingId(),
            externalMeetingId = meeting.externalMeetingId(),
            mediaPlacement: MediaPlacementDto(
                audioFallbackUrl = meeting.mediaPlacement().audioFallbackUrl(),  
                audioHostUrl = meeting.mediaPlacement().audioHostUrl(),  
                screenDataUrl = meeting.mediaPlacement().screenDataUrl(),  
                screenSharingUrl = meeting.mediaPlacement().screenSharingUrl(),  
                screenViewingUrl = meeting.mediaPlacement().screenViewingUrl(),  
                signalingUrl = meeting.mediaPlacement().signalingUrl(),  
                turnControlUrl = meeting.mediaPlacement().turnControlUrl()
            ),
            mediaRegion = meeting.mediaRegion()
        )
        val attendeeDto = AttendeeDto(
            attendeeId = attendee.attendee().attendeeId(),
            externalUserId = attendee.attendee().externalUserId(),
            joinToken = attendee.attendee().joinToken()
        )
        
        return mapOf(
            "meeting" to meetingDto,
            "attendee" to attendeeDto
        )
    }
}
```

미팅 참여 API EndPoint
```kotlin
@RestController
class MeetingController(
    private val meetingService: MeetingService
) {
    @PostMapping("/api/meetings/join")
    fun join(
        @RequestBody request: JoinRequest
    ): Map<String, Any> {
        return meetingService.joinMeeting(request.roomId, request.externalUserId)
    }
}
```

##### (추가) Redis 사용을 위한 설정
Gradle 설정 추가
```kotlin
implementation("org.springframework.boot:spring-boot-starter-data-redis")
```

application-local.yml 설정
```yml
spring:
  redis:
    host: localhost
    port: 6379
```

RedisTemplate Bean 등록
```kotlin
@Configuration
class RedisConfig {
    @Bean
    fun redisTemplate(connectionFactory: LettuceConnectionFactory): RedisTemplate<String, Any> {
        val template = RedisTemplate<String, Any>()
        template.setConnectionFactory(connectionFactory)
        template.keySerializer = StringRedisSerializer()
        template.valueSerializer = GenericJackson2JsonRedisSerializer(jacksonObjectMapper())
        return template
    }
}
```

### 프론트엔드 파트
#### 화상통화방 참여 화면
본인 비디오 + 상대방 비디오가 보이는 화면 (MeetingDemo.tsx)
```tsx
import React, { useRef, useState } from 'react';
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
  VideoTileState,
} from 'amazon-chime-sdk-js';

const MeetingDemo: React.FC = () => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [joined, setJoined] = useState(false);

  const joinMeeting = async () => {
    const res = await fetch('/api/meetings/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: 'demo-room',                    // 모든 참가자가 동일 roomId 사용
        externalUserUuid: `user-${Date.now()}`, // 참가자 구분용
      }),
    });
    const data = await res.json();

    const meetingResponse = data.meeting;
    const attendeeResponse = data.attendee;

    const logger = new ConsoleLogger('ChimeLogs', LogLevel.INFO);
    const deviceController = new DefaultDeviceController(logger);

    const configuration = new MeetingSessionConfiguration(
      meetingResponse,
      attendeeResponse
    );
    const meetingSession = new DefaultMeetingSession(
      configuration,
      logger,
      deviceController
    );

    // 오디오/비디오 장치 설정
    const audioInputs = await meetingSession.audioVideo.listAudioInputDevices();
    if (audioInputs.length > 0) {
      await meetingSession.audioVideo.startAudioInput(audioInputs[0].deviceId);
    }
    const videoInputs = await meetingSession.audioVideo.listVideoInputDevices();
    if (videoInputs.length > 0) {
      await meetingSession.audioVideo.startVideoInput(videoInputs[0].deviceId);
    }

    // Observer 등록
    meetingSession.audioVideo.addObserver({
      videoTileDidUpdate: (tileState: VideoTileState) => {
        if (!tileState.tileId || !tileState.boundAttendeeId) return;

        // 로컬 비디오
        if (tileState.localTile && localVideoRef.current) {
          meetingSession.audioVideo.bindVideoElement(
            tileState.tileId,
            localVideoRef.current
          );
        }

        // 원격 비디오
        if (!tileState.localTile) {
          let videoEl = document.getElementById(
            `video-${tileState.boundAttendeeId}`
          ) as HTMLVideoElement;

          if (!videoEl) {
            videoEl = document.createElement('video');
            videoEl.id = `video-${tileState.boundAttendeeId}`;
            videoEl.autoplay = true;
            videoEl.playsInline = true;
            videoEl.style.width = '200px';
            videoEl.style.height = '150px';
            document.getElementById('remote-container')?.appendChild(videoEl);
          }

          meetingSession.audioVideo.bindVideoElement(tileState.tileId, videoEl);
        }
      },
    });

    // 미팅 시작
    meetingSession.audioVideo.start();
    meetingSession.audioVideo.startLocalVideoTile();

    setJoined(true);
  };

  return (
    <div>
      <h1>AWS Chime Meeting Demo</h1>
      {!joined ? (
        <button onClick={joinMeeting}>Join Meeting</button>
      ) : (
        <p>미팅에 참가했습니다. 내 비디오와 상대방의 비디오가 보입니다.</p>
      )}

      {/* 로컬 비디오 */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{ width: 400, height: 300, background: '#000' }}
      />

      {/* 원격 비디오들이 추가될 영역 */}
      <div
        id="remote-container"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '1rem' }}
      />
    </div>
  );
};

export default MeetingDemo;
```

미팅 화면 보여주기 (App.tsx)
```tsx
import React from 'react';
import MeetingDemo from './components/MeetingDemo';

function App() {
  return (
    <div>
      <MeetingDemo />
    </div>
  );
}

export default App;
```

Vite 프록시 설정 (vite.config.ts)
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,   // Vite dev server를 3000번 포트로 실행
    proxy: {
      '/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

### 테스트 방법
1. Spring Boot 및 React dev 실행
2. 브라우저에서 `http://localhost:3000` 접속
3. Join Meeting 버튼 클릭, 미팅 정상 생성 후 미팅 접속하는 점 확인
4. 다른 브라우저 (또는 시크릿 창)에서 `http://localhost:3000` 접속
5. Join Meeting 버튼 클릭, 로컬 비디오와 원격 비디오 화면이 나타나는 점 확인

### 예제 화면
![chime-meeting-screen](https://i.imgur.com/jaUxOFb.png)
