---
layout:	post
title: Presigned URL 그것은 새로운 파일 전송의 시작이었다.
date: 2025-06-02 15:05:10 +0900
sitemap:
image: technology-17.jpg
author: GyuMyung
tags: technology
comments: true
---

## Pre-signed URL을 사용해보자
### Pre-signed URL 이란
Pre-signed (미리 서명된) URL 이란 **AWS 자원의 접근 권한을 제공하기 위해서 사용되는 이전에 미리 적절한 권한을 가진 자격증명으로 서명된 URL**을 말한다.

회사에서 기존에는 S3에 저장된 파일에 대한 정보를 클라이언트에게 전달해줄 때 Blob 형태로 가져와 Base64로 변환 후 전달하는 방식으로 전달해주고 있었는데, 이와 관련해서 프론트엔드 측에 이슈가 발생했다. 해당 이슈를 해결하기 위해 파일에 대한 정보를 URL 형태로 전달해줘야 했는데, 일반적으로 private 버킷에 대한 URL은 엑세스 권한이 없으면 접근할 수 없다.<br/>
그래서 Pre-signed URL이 필요하게 되었다.

### Pre-signed URL을 사용했을 때 장점
**서버 부담 감소**

Base64 방식은 파일을 바이트 배열로 가져와 서버에서 직접 클라이언트에게 전달하기 때문에 서버의 메모리 및 네트워크 사용량이 커진다.<br/>
반면에 Pre-signed URL은 클라이언트가 URL을 통해 S3에서 직접 파일을 다운로드받는 방식이므로, 서버 리소스 사용이 현저히 줄어든다.

**대용량 파일에 대한 처리에 유리**

Base64 방식은 변환하면서 원본보다 크기가 약 33% 증가한다. (ASCII 문자로 인코딩하면서)<br/>
하지만 Pre-signed URL은 단순히 URL을 전달하는 방식으로, 대용량 파일이더라도 응답 속도가 빠르다.

(사실 위 두 부분은 URL 방식의 장점이라고 볼 수 있다.)

**보안 제어에 유연함**

Pre-signed URL은 URL에 유효 시간을 부여하여 일정 시간 후 자동으로 만료하는 방식이므로 보안성에 대한 제어에 유연하다.<br/>
권한이 제한된 S3 객체에 대해서도 일정 시간 동안 접근을 허용한다는 식으로도 보안 정책을 세우기 용이하다.

### Pre-signed URL을 사용할 때 주의점
**보안상 노출 위험**

아무래도 URL이 유효한 동안에는 누구나 접근 가능하다. 따라서 HTTPS 사용은 필수이며, 유효시간을 짧게 설정하는 방식으로 제어가 필요하다.

**사용자 인증 통제**

Base64의 경우에는 인증된 사용자만 접근할 수 있도록 제어하기 쉬웠다.<br/>
Pre-signed URL은 URL을 받은 사람이 누구든 접근 가능하기 때문에 서버단 인증 체크가 어렵다. 따라서 Pre-signed URL 생성 전에 서버단에서 인증/권한 검증을 수행하는 식으로 인증을 통제해야 한다.<br/>
회사에서는 API 요청할 때 토큰 등 인증 정보를 받기 떄문에 어느정도 인증에 대한 문제는 커버 가능했다.

### Pre-signed URL 사용 예시 코드
```java
@Value("${aws.region}")
private String region;

@Value("${aws.access-key}")
private String accessKey;

@Value("${aws.secret-key}")
private String secretKey;

public String generatePreSignedUrl(FileDto fileDto) {
    String preSignedUrl = "";
    
    try {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
            .bucket(fileDto.getGcsBucketName())
            .key(fileDto.getStoreFileName())
            .build();
        
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinute(5))   // 유효 시간 설정
            .getObjectRequest(getObjectRequest)
            .build();
        
        // pre-signed URL 설정
        Region awsRegion = Region.of(region);
        AwsBasicCredentials awsCredentials = AwsBasicCredentials.create(accessKey, secretKey);
        StaticCredentialsProvider credentialsProvider = StaticCredentialsProvider.create(awsCredentials);

        S3Presigner presigner = S3Presigner.builder()
            .region(awsRegion)
            .credentialsProvider(credentialsProvider)
            .build();
        
        preSignedUrl = presigner.presignGetObject(presignRequest).url().toString();
    } catch (Exception e) {
        log.error(e.getMessage());
    }
    
    return preSignedUrl;
}
```

