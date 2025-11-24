---
layout:	post
title: RestDocs로 OpenAPI Swagger 문서 생성하기
date: 2025-11-19 20:22:01 +0900
sitemap: 
image: technology-20.png
author: GyuMyung
tags: technology
comments: true
---

Spring Boot 프로젝트를 운영하면서 API 명세서 문서를 RestDocs를 활용해 운영 중인데, OpenAPI Swagger 문서가 필요한 경우가 있다. 나의 경우에는 프론트엔드에서 OpenAPI Generator를 통해 API 스펙을 자동으로 만들어주기 위해서 Swagger 문서가 필요했다.

이번 포스팅에서는 RestDocs 테스트코드를 기반으로 OpenAPI Swagger 문서를 만들어주는 방법을 다뤄보겠다.

### restdocs-api-spec 라이브러리
`com.epages.restdocs-api-spec` 이라는 라이브러리가 있다. RestDocs 테스트코드 형태는 그대로 작성하되, 해당 라이브러리에서 제공하는 클래스를 사용해 일부분만 수정을 해주면 테스트코드를 읽어들여 OpenAPI Swagger 문서를 생성해준다.

#### 준비 사항
먼저 의존성 추가 및 Task 설정을 위한 `build.gradle` 설정을 추가해줘야 한다. (`build.gradle.kts` 기준으로 작성)

```kts
import com.epages.restdocs.apispec.gradle.OpenApi3Task  
import io.swagger.v3.oas.models.servers.Server

plugins {
    // 기존 플러그인들...
    
    // restdocs-api-spec 추가, 포스팅 일자 기준으로 최신 버전으로 작성
    id("com.epages.restdocs-api-spec") version "0.19.4"
}

dependencies {
    // 기존 의존성들...
    
    // restdocs-api-spec mockmvc 추가
    testImplementation("com.epages:restdocs-api-spec-mockmvc:0.19.4")
}

tasks.test {
    // OpenAPI Swagger 파일이 생성될 경로
    outputs.dir(file("build/api-spec"))
    useJUnitPlatform()
}

tasks.withType<OpenApi3Task> {
    dependsOn(tasks.test)
    outputDirectory = "build/api-spec"
    title = "API Documentation"
    description = "Swagger API 문서"
    format = "json" // 또는 "yaml"도 가능
    separatePublicApi = true
    outputFileNamePrefix = "openapi"
    // 실제 프론트엔드에서 API 호출할 서버 URL
    servers = listOf(  
    Server().url("https://example-api.co.kr").description("Test Server")  
)

    doLast {
        copy {
            from(file("build/api-spec"))
            into("src/main/resources/static")
        }
    }
}

tasks.bootJar {
    enabled = true
    dependsOn("openapi3")
    // 외부에서 Swagger json 문서 접근을 위한 설정
    from("build/api-spec") {
        into("BOOT-INF/classes/static")
        duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    }
}

tasks.build {
    dependsOn(tasks.bootJar)
}
```

위와 같이 설정을 추가하면 `gradlew build` 수행 시 테스트를 수행하고, OpenAPI Swagger 문서를 생성하는 태스크를 실행한다.

### 테스트 코드 작성
RestDocs 테스트 코드 형태는 유지하되, `com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper`의 `document()` 메서드를 사용하는 게 다른 점이다.

간단한 예제 테스트 코드를 작성하겠다.

```kotlin
// 생략 ...

mockMvc.perform(
    RestDocumentationRequestBuilders.post("/api/users")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(request))
).andExpect(MockMvcResultMatchers.status().isOk)
    .andDo(
        // com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document 사용
        MockMvcRestDocumentationWrapper.document(
            "Create-User", // RestDocs 스니펫 식별자
            "유저를 생성하기 위한 요청", // API 설명
            "유저 생성", // 설명 요약
            false, // 외부 공개용 API (내부 시스템용 API는 true)
            false, // 폐기용 API 여부 (앞으로 사용하지 않을 API이면 true)
            preprocessRequest(
                modifyUris().scheme("https").host("example-api.co.kr").removePort(),
            ),
            preprocessResponse(prettyPrint()),
            Function.identity(),
            // 아래는 RestDocs 작성 그대로
            PayloadDocumentation.requestFields(
                PayloadDocumentation.fieldWithPath("userId").type(JsonField.STRING).descrption("사용자 ID"),
                PayloadDocumentation.fieldWithPath("password").type(JsonField.STRING).descrption("사용자 패스워드")
                
            ),
            PayloadDocumentation.responseFields(
                PayloadDocumentation.fieldWithPath("result").type(JsonField.STRING).descrption("응답 결과"),
                PayloadDocumentation.fieldWithPath("code").type(JsonField.STRING).descrption("응답 코드")
            )
        )
    )
```

위는 Swagger 문서를 간단한 형태로 만드는 예제이다. 하지만 위와 같은 예제처럼 작성하면 `Tag` 값이 API Url의 앞 단어로 자동 생성된다. (위 예제라면 `api`) 만약 `Tag` 값을 직접 입력하고 싶다면 아래 예제처럼 작성하면 된다.

```kotlin
// 생략 ...

mockMvc.perform(
    RestDocumentationRequestBuilders.post("/api/users")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(request))
).andExpect(MockMvcResultMatchers.status().isOk)
    .andDo(
        // com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document 사용
        MockMvcRestDocumentationWrapper.document(
            "Create-User", // RestDocs 스니펫 식별자
            ResourceSnippetParameters.builder()
                .tag("사용자") // Swagger 문서의 Tag 값
                .summary("유저 생성") // 설명 요약
                .description("유저를 생성하기 위한 요청") // API 설명
                .requestFields( // API Body 값
                    PayloadDocumentation.fieldWithPath("userId").type(JsonField.STRING).descrption("사용자 ID"),
                    PayloadDocumentation.fieldWithPath("password").type(JsonField.STRING).descrption("사용자 패스워드")                    
                )
                .responseFields( // API Response 값
                    PayloadDocumentation.fieldWithPath("result").type(JsonField.STRING).descrption("응답 결과"),
                    PayloadDocumentation.fieldWithPath("code").type(JsonField.STRING).descrption("응답 코드")
                ), // .build() 호출 X, builder() 자체가 파라미터로 필요한 추상 클래스를 상속함
            preprocessRequest(
                modifyUris().scheme("https").host("example-api.co.kr").removePort(),
            ),
            preprocessResponse(prettyPrint()),
            Function.identity(),
            // 아래는 RestDocs 작성 그대로
            PayloadDocumentation.requestFields(
                PayloadDocumentation.fieldWithPath("userId").type(JsonField.STRING).descrption("사용자 ID"),
                PayloadDocumentation.fieldWithPath("password").type(JsonField.STRING).descrption("사용자 패스워드")
                
            ),
            PayloadDocumentation.responseFields(
                PayloadDocumentation.fieldWithPath("result").type(JsonField.STRING).descrption("응답 결과"),
                PayloadDocumentation.fieldWithPath("code").type(JsonField.STRING).descrption("응답 코드")
            )
        )
    )
```

이처럼 `com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper`의 `document()` 메서드는 다양한 형태로 오버로딩되어 있기 때문에 상황에 맞게 작성하면 된다.

이렇게 예제 코드처럼 테스트 코드를 작성하고 build를 실행하면 `build/api-spec` 경로와 `src/main/resources/static` 경로에 Swagger 문서인 openapi3.json 파일이 생성될 것이다.
